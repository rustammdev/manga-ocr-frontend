export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border bg-white/70 p-12 text-center">
      <div className="text-4xl">🔎</div>
      <h1 className="mt-4 text-2xl font-semibold">Sahifa topilmadi</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Manzil noto'g'ri yoki o'chirilgan bo'lishi mumkin.
      </p>
    </div>
  );
}
