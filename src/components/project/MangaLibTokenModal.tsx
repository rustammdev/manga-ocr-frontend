import { useCallback, useEffect, useState } from "react";
import {
  X,
  KeyRound,
  Loader2,
  Check,
  Trash2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "../../lib/api";
import type { MangaLibTokenStatus } from "../../lib/types";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";

interface MangaLibTokenModalProps {
  open: boolean;
  onClose: () => void;
  /** Token holati o'zgarganda (saqlandi/o'chirildi) — parent yangilashi uchun. */
  onChanged?: (status: MangaLibTokenStatus) => void;
}

/**
 * 18+ kontent uchun global MangaLib auth token (JWT). Token global saqlanadi
 * (DB da `_id="global"`) va barcha MangaLib so'rovlariga avtomat
 * `Authorization: Bearer` sifatida qo'shiladi.
 *
 * Foydalanuvchi `mangalib.me` localStorage'dagi tokenni (yoki butun auth
 * blokini) bitta inputga qo'yib saqlaydi.
 */
export default function MangaLibTokenModal({
  open,
  onClose,
  onChanged,
}: MangaLibTokenModalProps) {
  const [status, setStatus] = useState<MangaLibTokenStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMangaLibToken();
      setStatus(res);
    } catch (e) {
      setError((e as Error).message || "Token holati yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setTokenInput("");
      setError(null);
      load();
    }
  }, [open, load]);

  if (!open) return null;

  const connected = status?.connected === true;

  async function handleSave() {
    const value = tokenInput.trim();
    if (!value) return;
    setSaving(true);
    setError(null);
    try {
      await api.saveMangaLibTokenRaw(value);
      toast.success("MangaLib token saqlandi");
      setTokenInput("");
      const res = await api.getMangaLibToken();
      setStatus(res);
      onChanged?.(res);
    } catch (e) {
      const msg = (e as Error).message || "Token saqlanmadi";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Saqlangan MangaLib tokenni o'chirmoqchimisiz?")) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteMangaLibToken();
      toast.success("Token o'chirildi");
      const res = await api.getMangaLibToken();
      setStatus(res);
      onChanged?.(res);
    } catch (e) {
      const msg = (e as Error).message || "Token o'chirilmadi";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="mx-4 flex max-h-[88vh] w-full max-w-lg flex-col rounded-lg border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">MangaLib token (18+)</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            disabled={saving || deleting}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <p className="text-xs text-muted-foreground">
            Token global saqlanadi va barcha MangaLib so'rovlariga (resolve /
            attach / sync / download) avtomat qo'shiladi — 18+ kontentni ochadi.
          </p>

          {/* Holat */}
          <div className="rounded-md border bg-muted/40 p-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Holat yuklanmoqda...
              </div>
            ) : connected ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="success" className="gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Ulangan
                  </Badge>
                  {status.user_label && (
                    <span className="text-xs text-muted-foreground">
                      {status.user_label}
                    </span>
                  )}
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  {status.token_hint && (
                    <>
                      <dt className="text-muted-foreground">Token</dt>
                      <dd className="font-mono">…{status.token_hint}</dd>
                    </>
                  )}
                  {status.updated_at && (
                    <>
                      <dt className="text-muted-foreground">Yangilangan</dt>
                      <dd>{new Date(status.updated_at).toLocaleString()}</dd>
                    </>
                  )}
                  {status.expires_at && (
                    <>
                      <dt className="text-muted-foreground">Amal qiladi</dt>
                      <dd>{new Date(status.expires_at).toLocaleString()}</dd>
                    </>
                  )}
                </dl>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="gap-1.5"
                >
                  {deleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Tokenni o'chirish
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Ulanmagan</Badge>
                <span className="text-xs text-muted-foreground">
                  Token saqlanmagan — 18+ kontent ochilmasligi mumkin.
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{error}</div>
            </div>
          )}

          {/* Token kiritish — bitta input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Token
            </label>
            <Textarea
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder={`mangalib.me localStorage'dagi token yoki butun auth blokini qo'ying`}
              className="min-h-[88px] font-mono text-xs"
              disabled={saving}
            />
            <p className="text-[11px] text-muted-foreground">
              <code>mangalib.me</code> → DevTools → Local Storage'dan JWT (
              <code>ey…</code>) yoki butun auth blokini (
              <code>{`{"access_token":"ey..."}`}</code>) nusxalab qo'ying.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving || deleting}>
            Yopish
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !tokenInput.trim()}
            className="gap-1.5"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Saqlash
          </Button>
        </div>
      </div>
    </div>
  );
}
