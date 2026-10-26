# 04 报价引擎

报价引擎是后端 `src/modules/pricing/engine/` 下的纯函数：`price(input, rates) → result`，不读数据库、不读时钟、
不依赖 Nest。服务层负责取当时生效的费率版本、调用引擎、保存不可修改的快照。网站、员工控制台、将来的聊天机器人都调用
同一个接口。规则来源：交接说明第 5 节 + 附件一（签字后以附件一为准）。

## 接口

```ts
type Product = 'SEA_PARCEL' | 'AIR' | 'SEA_LCL' | 'FCL';
type Region = 'AKL' | 'NI_OTHER' | 'SI';
type ValueBand = 'LT_400' | 'B400_1000' | 'GTE_1000';   // NZD 申报货值

interface QuoteInput {
  product: Product;
  destination: { region: Region; cityId?: string; postcode?: string };
  packages: { weightKg: Decimal; lengthCm?: Decimal; widthCm?: Decimal; heightCm?: Decimal; volumeM3?: Decimal }[];
  valueBand: ValueBand;
  fcl?: { size: '20' | '40'; originPort: string; destPort: string; includeLocalCharges: boolean };
}

interface QuoteLine {
  code: string;            // 'FREIGHT' | 'CLEARANCE' | 'DELIVERY' | 'HANDLING' | 'CARTON' | 'UNPACK' | 'FCL_*'
  label: { en: string; zh: string };
  amount: Decimal;         // ex GST
  currency: 'NZD' | 'USD';
  taxCode: 'GST15' | 'ZERO' | 'NONE';   // DECISION(F1)
}

interface QuoteResult {
  status: 'OK' | 'REQUIRES_REVIEW';
  reviewReasons: string[];               // 'QUOTE_ON_REQUEST_ZONE' | 'OVERSIZE' | 'AIR_RULES_UNSIGNED' | 'FCL_RATE_EXPIRED' …
  lines: QuoteLine[];
  totals: { currency: 'NZD' | 'USD'; amountExGst: Decimal; gstApplies: boolean }[]; // FCL 两个币种分开
  trace: { step: string; value: string }[];   // 每个舍入和取值步骤，客服可解释
  rateVersionIds: string[];
  engineVersion: string;
}
```

前端只显示 `lines`、`totals` 和“+GST”字样，不计算 GST 金额（发票才算）。

## 通用规则

- 货币 NZD，FCL 海运费 USD；两者不换算、不相加（DECISION(F3)）。
- 清关费按申报货值档（DECISION(C2)：每票货收一次）：

| 产品 | < 400 | 400–1,000 | ≥ 1,000 |
| --- | --- | --- | --- |
| 海运小包、空运 | 12.00 | 69.50 | 127.00 |
| 海运拼箱 LCL | 115.00 | 172.50 | 212.75 |

- 进口 GST 和关税不计算，只在界面显示固定告知文案（DECISION(F2)）。
- 住宅派送、查验、检疫、仓储、危险品、超大件等不在自动报价内（DECISION(E3)）。
- 邮编 0600–2699 视为奥克兰（工作假设，待核对）；“价格需询问”区域返回 `REQUIRES_REVIEW`。

## 海运小包 SEA_PARCEL（≤ 100 kg、≤ 1 m³，DECISION(A1)）

```
volumeM3     = Σ 包裹体积                                  // DECISION(B3) 整票汇总
chargeableKg = roundUpToHalf( max(Σ weightKg, volumeM3 × 200) )   // DECISION(B4) 整票进位到 0.5
rate         = AKL: 2 ；NI_OTHER: <20 kg 6，≥20 kg 4 ；SI: <20 kg 7，≥20 kg 5
freight      = round2( chargeableKg × rate )
freight      = max(freight, floorFromPreviousTier)        // DECISION(C1) 价格下限：不低于上一档最高价
total        = freight + clearance(valueBand)
```

C1 的下限：例如 NI_OTHER 20 kg 起按 4/kg，但不得低于 19.5 kg × 6 = 117.00，直到 4/kg 的金额超过 117。

## 空运 AIR

体积重系数（B1）和费率单位（B2）未签字，**不设默认值**：引擎返回 `REQUIRES_REVIEW` + `AIR_RULES_UNSIGNED`。
签字后公式与海运小包相同结构：

```
chargeableKg = roundUpToHalf( max(Σ weightKg, volumeM3 × airDivisor) )
rate (per kg) = 按签字后的空运费率表（交接说明给出 AKL 7/6、NI_OTHER 10/8、SI 12/10，10 kg 分档，单位待 B2）
```

## 海运拼箱 SEA_LCL

```
rt              = max(volumeM3, totalKg / 1000, 1)                  // 不舍入
freight         = round2(rt × 200)
deliveryUnits   = round3( max(volumeM3, totalKg / 167) )            // DECISION(B5) 先舍入到 3 位
deliveryRate    = cityBaseRate + zoneSurcharge                        // Metro 0 · Zone1 23.12 · Zone2 64.73 · Zone3 124.84
delivery        = max( round2(deliveryUnits × deliveryRate), minimum ) // DECISION(C3) 每票
minimum         = 奥克兰市区 61.65 · 南岛和跨海 84.77 · 其他 53.94
total           = freight + clearance(LCL band) + delivery          // clearance、delivery 为 GST15
```

城市基础费率来自 NAL 门到门费率表（奥克兰 38.53/m³；Oamaru 426.45 待核对）。先选大区再选城市，城镇不在列表时才要邮编。

## 整柜 FCL（第 1 阶段只预估，DECISION(G3) 过期停止出数）

```
A (USD) = 港口运价[size] + FAF(20: 359, 40: 718) + EFS(20: 50, 40: 100)
          + (Wellington 且 JKN 航线 ? 200 : 0)；转运港 → 不报惠灵顿（REQUIRES_REVIEW）
B (NZD, 可选) = 120 + THD(20: 571, 40: 891) + 73 + 90 + TAC[港口][size] + 1,669.64
TAC: 奥克兰 94.50/144.50 · 陶朗加 50/100 · 利特尔顿 124/219 · 惠灵顿 35/60 · 纳皮尔 199/374（1 月 1 日起 219/414；11–12 月未给出，DECISION(X-1)）
显示：“USD A + NZD B +GST”，有效期 3 天，附默认条件和免责声明
```

## 舍入（DECISION(B6)）

| 步骤 | 规则 |
| --- | --- |
| 计费重量 | 向上进位到 0.5 kg（整票） |
| LCL 运费吨 | 不舍入 |
| LCL 派送计费单位 | 四舍五入到 3 位小数 |
| 每个费用行 | 四舍五入（half-up）到 0.01 |
| 合计 | 各行相加，不再舍入 |
| GST | 只在发票上按行计算，四舍五入到 0.01 |

## 费率表 payload（示例结构）

```json
{
  "product": "SEA_PARCEL",
  "volumetricKgPerM3": 200,
  "roundUpKg": "0.5",
  "regions": {
    "AKL":      { "tiers": [{ "fromKg": "0", "perKg": "2" }] },
    "NI_OTHER": { "tiers": [{ "fromKg": "0", "perKg": "6" }, { "fromKg": "20", "perKg": "4" }] },
    "SI":       { "tiers": [{ "fromKg": "0", "perKg": "7" }, { "fromKg": "20", "perKg": "5" }] }
  },
  "tierMode": "WHOLE_WITH_FLOOR",
  "clearance": { "LT_400": "12", "B400_1000": "69.50", "GTE_1000": "127" },
  "limits": { "maxKg": "100", "maxM3": "1" }
}
```

`tierMode` 取值：`WHOLE`（整票按档）、`INCREMENTAL`（超额累进）、`WHOLE_WITH_FLOOR`（★ 默认）。新区域只加数据。

## 版本与快照

- 费率改动：草稿 → 试算（用最近 100 个真实报价重算并显示差额）→ 发布（管理员，MFA，写审计）→ 按 `effective_from` 生效。
- 预估快照锁预报时生效的版本，有效 14 天（DECISION(E1)）；最终价快照用入库时生效的版本（DECISION(E2)）。
- 快照写入后不可改；最终价变化 = 新快照，客户界面同时显示预估和最终价的差异。

## 必须通过的算例

| 场景 | 输入 | 预期 |
| --- | --- | --- |
| 海运小包 奥克兰 | 7 kg，货值 < 400 | 7 × 2 + 12 = **NZD 26.00** |
| LCL Kerikeri | 3.32 m³，1,820 kg，货值 ≥ 1,000 | 运费 664.00；清关 212.75；派送 10.898 × 144.88 = 1,578.90；**合计 2,455.65 +GST** |
| FCL 40 尺 上海 → 奥克兰 | A + B | **USD 6,818；NZD 2,988.14 +GST** |
| FCL 20 尺 上海 → 奥克兰 | A + B | **USD 3,409；NZD 2,618.14 +GST** |
| FCL 40 尺 重庆 → 陶朗加 | A + B | **USD 7,351；NZD 2,943.64 +GST** |
| FCL 转运港 → 惠灵顿 | 任意 | `REQUIRES_REVIEW` |

边界测试：10 / 19.5 / 20 / 25 / 100 kg、1 m³、单边 1.5 m、货值 399.99 / 400 / 999.99 / 1,000；
C1 选定规则下的方向性测试；空运在 B1/B2 签字前返回 `REQUIRES_REVIEW`。
