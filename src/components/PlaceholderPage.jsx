export default function PlaceholderPage({ icon: Icon, title, blurb }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 text-center">
      <div className="card mx-auto max-w-xl p-10">
        {Icon && (
          <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2e7bff22] text-[#6ea8ff]">
            <Icon size={28} />
          </span>
        )}
        <h1 className="font-display text-3xl">{title}</h1>
        <p className="mt-3 text-[#9aa3bd]">{blurb}</p>
        <p className="mt-6 inline-block rounded-full border border-[#6ea8ff33] px-4 py-1.5 text-xs font-medium tracking-wide text-[#6ea8ff] uppercase">
          Coming in a later step
        </p>
      </div>
    </section>
  )
}
