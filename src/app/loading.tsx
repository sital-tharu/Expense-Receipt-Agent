export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl animate-pulse px-6 py-10">
      <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-900" />
      <div className="mt-2 h-5 w-36 rounded bg-gray-100 dark:bg-gray-900" />
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[1.3fr_1fr]">
        <div className="h-24 rounded-xl bg-gray-50 dark:bg-gray-900/60" />
        <div className="h-24 rounded-xl bg-gray-50 dark:bg-gray-900/60" />
      </div>
      <div className="mt-6 space-y-2">
        <div className="h-12 rounded-lg bg-gray-50 dark:bg-gray-900/60" />
        <div className="h-12 rounded-lg bg-gray-50 dark:bg-gray-900/60" />
        <div className="h-12 rounded-lg bg-gray-50 dark:bg-gray-900/60" />
      </div>
      <div className="mt-6 h-40 rounded-lg bg-gray-50 dark:bg-gray-900/60" />
    </main>
  );
}
