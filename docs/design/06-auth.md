# 06 身份认证与权限

登录由 Supabase Auth 负责，后端只校验 JWT 并把用户映射到 `customers` 或 `staff_users`。

## 客户

| 方式 | 阶段 | 实现 |
| --- | --- | --- |
| 邮箱 6 位验证码 | 1 | Supabase email OTP（不用魔法链接，避免内置浏览器丢会话） |
| Google | 1 | Supabase OAuth；在内置浏览器里提示用 Safari/Chrome 打开 |
| WhatsApp 验证码 | 1 | Supabase phone OTP + **Send SMS Hook**（HTTP 类型，指向后端 `POST /api/v1/auth-hooks/send-sms`，校验 hook 签名）把验证码改由 WhatsApp 认证模板发送（复制验证码按钮） |
| WhatsApp 反向验证（一键） | 1，spike 通过后 | 见下 |
| Facebook、短信验证码 | 3 | Supabase OAuth / phone OTP（短信渠道） |

首次登录：后端 `GET /me` 发现没有 `customers` 记录时创建，分配会员号，记录首次来源（lead）。

**账户合并**：一个客户多个 `customer_identities`。新登录方式只能在已登录状态下绑定；若该邮箱/手机号已属于另一个客户，
提示用原方式登录，不自动合并。两个都有货件的账户只能由运营合并并写审计。

**账户恢复**（第 1 阶段）：换号码 / 号码回收 → 通过已绑定邮箱验证码登录后更换；都不可用 → 运营人工核验（会员号 +
历史货件信息）后重置，写审计。

## WhatsApp 反向验证（先做 4–6 小时 spike）

目标流程：页面生成一次性码 → 打开 `wa.me/<号码>?text=CE-LOGIN-<code>` → 客户发送 → webhook 核对发送方号码 → 登录。

必须拒绝的用例：**攻击者在自己浏览器生成码，诱导受害者用 WhatsApp 发送，系统把攻击者浏览器登录成受害者。**
“8 位码 + 绑定会话 + 一次消费”挡不住它。spike 需要验证的缓解措施：

1. webhook 收到后回复受害者一条 WhatsApp 消息（交互按钮），列出 3 个两位数字，只有和发起页面显示的数字一致的那个能完成登录（数字匹配）；消息里写明“如果不是你本人在登录，请忽略”。
2. 码 ≥ 8 位、5 分钟有效、一次消费、绑定发起会话 ID、核对发送方号码与码的发起设备无关联时不自动放行。
3. 在 Supabase 侧建立会话的方式（admin API 生成一次性 token 让发起浏览器兑换）需要在 spike 中确认可行。

spike 不通过：第 1 阶段只上线 WhatsApp 验证码（上表第 3 行），反向验证不做。结论写 ADR。

## 员工

- 邮箱 + 密码 + **TOTP 强制**（Supabase MFA）；员工接口要求 `aal2`。
- 角色：`admin`（第 1 阶段：价格发布、员工管理）、`warehouse`、`nz_ops`、`finance`（第 2 阶段）。
- 仓库平板可多人共用：快速切换账号，但每个操作都记录到具体员工。

## 后端校验

- `JwtGuard`：用 `SUPABASE_JWKS_URL` 校验签名、`exp`、`aud`；取 `sub`、`aal`。
- `RolesGuard`：查 `staff_users`（缓存 60 秒）；客户接口查 `customers.auth_user_id`。
- 数据级权限：客户只能访问 `customer_id = 自己` 的数据，在 repository 层统一加条件。

## 防滥用

OTP 发送按号码、IP、设备限流；登录失败锁定；匿名报价接口限流；验证码用 Cloudflare Turnstile 或 hCaptcha（不用 reCAPTCHA）。
