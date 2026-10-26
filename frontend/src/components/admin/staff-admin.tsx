"use client";

import { upsertById } from "@/lib/api/cache";
import { ErrorText } from "@/components/feedback";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { DATA_HEAD_ROW, DATA_ROW, DATA_TABLE } from "@/components/rates/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { When } from "@/components/when";
import { $api, idem } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";
import { STAFF_MODULES, type StaffRole } from "@/lib/staff/modules";

type StaffUser = components["schemas"]["StaffUser"];
const ROLES = STAFF_MODULES.map((m) => m.role);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Staff accounts (design 06): invite by email (TOTP is set up at first sign-in), change roles, deactivate. Audited. */
export function StaffAdmin() {
  const t = useTranslations("admin.staff");
  const tr = useTranslations("admin.roles");
  const queryClient = useQueryClient();
  const list = $api.useQuery("get", "/admin/staff");
  const update = $api.useMutation("patch", "/admin/staff/{staffId}");
  const key = $api.queryOptions("get", "/admin/staff").queryKey;
  const put = (u: StaffUser) => queryClient.setQueryData(key, upsertById(u));
  const patch = (id: string, body: components["schemas"]["StaffUpdate"]) =>
    update.mutate({ params: { path: { staffId: id }, header: idem() }, body }, { onSuccess: put });

  if (list.isError) return <ErrorText>{t("loadFailed")}</ErrorText>;
  return (
    <div className="grid gap-6">
      <table className={DATA_TABLE} data-testid="staff">
        <thead><tr className={DATA_HEAD_ROW}><th>{t("name")}</th><th>{t("email")}</th><th>{t("roles")}</th><th>{t("mfa")}</th><th>{t("lastSignIn")}</th><th>{t("status")}</th><th /></tr></thead>
        <tbody>
          {list.data?.map((s) => (
            <tr key={s.id} className={`${DATA_ROW} align-top`}>
              <td>{s.name}</td>
              <td>{s.email}</td>
              <td>
                <div className="flex flex-wrap gap-x-3">
                  {ROLES.map((role) => (
                    <label key={role} className="flex items-center gap-1">
                      <input type="checkbox" checked={s.roles.includes(role)} disabled={s.status === "inactive" || update.isPending}
                        aria-label={t("roleFor", { role: tr(role), name: s.name })}
                        onChange={(e) => patch(s.id, { roles: e.target.checked ? [...s.roles, role] : s.roles.filter((r) => r !== role) })} />
                      {tr(role)}
                    </label>
                  ))}
                </div>
              </td>
              <td>{s.mfaEnrolled ? t("mfaOn") : <span className="text-warning">{t("mfaPending")}</span>}</td>
              <td>{s.lastSignInAt ? <When iso={s.lastSignInAt} /> : "—"}</td>
              <td><StatusBadge group="staff" value={s.status} /></td>
              <td className="text-right">
                <Button size="sm" variant="outline" disabled={update.isPending}
                  onClick={() => patch(s.id, { status: s.status === "active" ? "inactive" : "active" })}>
                  {t(s.status === "active" ? "deactivate" : "reactivate")}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <InviteStaff onInvited={put} />
    </div>
  );
}

function InviteStaff({ onInvited }: { onInvited: (u: StaffUser) => void }) {
  const t = useTranslations("admin.staff");
  const tr = useTranslations("admin.roles");
  const invite = $api.useMutation("post", "/admin/staff");
  const [form, setForm] = useState<{ name: string; email: string; roles: StaffRole[] }>({ name: "", email: "", roles: [] });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !EMAIL.test(form.email.trim()) || form.roles.length === 0) return setError(t("inviteInvalid"));
    setError(null);
    invite.mutate({ params: { header: idem() }, body: { name: form.name.trim(), email: form.email.trim(), roles: form.roles } }, {
      onSuccess: (u) => { onInvited(u); setDone(t("invited", { email: u.email })); setForm({ name: "", email: "", roles: [] }); },
      onError: () => setError(t("inviteFailed")),
    });
  }

  return (
    <form onSubmit={submit} className="grid max-w-xl gap-3 border border-rule bg-surface p-4" noValidate data-testid="invite">
      <h2 className="font-semibold">{t("inviteTitle")}</h2>
      <Label htmlFor="invite-name">{t("name")}</Label>
      <Input id="invite-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Label htmlFor="invite-email">{t("email")}</Label>
      <Input id="invite-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <fieldset className="flex flex-wrap gap-4">
        <legend className="mb-1">{t("roles")}</legend>
        {ROLES.map((role) => (
          <label key={role} className="flex items-center gap-1">
            <input type="checkbox" checked={form.roles.includes(role)}
              onChange={(e) => setForm({ ...form, roles: e.target.checked ? [...form.roles, role] : form.roles.filter((r) => r !== role) })} />
            {tr(role)}
          </label>
        ))}
      </fieldset>
      <p className="text-xs text-muted-foreground">{t("inviteNote")}</p>
      <ErrorText className="text-sm">{error}</ErrorText>
      {done && <p role="status" className="text-sm text-success">{done}</p>}
      <Button type="submit" className="justify-self-start" disabled={invite.isPending}>{t("invite")}</Button>
    </form>
  );
}
