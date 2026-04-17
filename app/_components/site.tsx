import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import productIcon from "@/assets/icon.png";

export const productName = "FinancePro";
export const planName = "Plano Profissional";
export const planPrice = "R$ 29,90";
export const planFrequency = "por mês";
export const supportEmail = "suporte@financepro.com.br";
export const purchaseHref = `mailto:${supportEmail}?subject=Comprar%20FinancePro`;
export const downloadHref =
  process.env.NEXT_PUBLIC_DOWNLOAD_URL || "/downloads/FinancePro-Setup-1.0.0.exe";

export const planItems = [
  "Contas a pagar",
  "Contas a receber",
  "Cadastro de clientes",
  "Cadastro de fornecedores",
  "Categorias",
  "Fluxo de caixa",
  "Relatórios",
  "Backup",
  "Atualizações do sistema",
  "Ativação por chave",
  "Uso em 1 computador",
];

const navItems = [
  { href: "/financeiro", label: "Vendas" },
  { href: "/download", label: "Download" },
  { href: "/ativar", label: "Ativar" },
  { href: "/comprar", label: "Comprar" },
];

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "light";
  className?: string;
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: ButtonLinkProps) {
  const variants = {
    primary:
      "border-[#0f766e] bg-[#0f766e] text-white hover:border-[#115e59] hover:bg-[#115e59]",
    secondary:
      "border-[#cfd6dd] bg-white text-[#171717] hover:border-[#9aa7b3] hover:bg-[#f2f5f7]",
    light:
      "border-white bg-white text-[#171717] hover:border-[#d8dee5] hover:bg-[#f2f5f7]",
  };
  const classes = `inline-flex min-h-12 items-center justify-center rounded-lg border px-5 py-3 text-center text-sm font-semibold transition ${variants[variant]} ${className}`;
  const isInternal = href.startsWith("/");
  const isHttp = href.startsWith("http");

  if (isInternal) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={classes}
      target={isHttp ? "_blank" : undefined}
      rel={isHttp ? "noreferrer" : undefined}
    >
      {children}
    </a>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#dfe4e8] bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
        <Link href="/financeiro" className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#d8dee5] bg-white">
            <Image src={productIcon} alt="" width={28} height={28} priority />
          </span>
          <span className="min-w-0 text-base font-bold text-[#171717]">
            {productName}
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-[#4b5563]">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 transition hover:bg-[#eef2f4] hover:text-[#171717]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[#2f3338] bg-[#171717] text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
              <Image src={productIcon} alt="" width={28} height={28} />
            </span>
            <span className="text-base font-bold">{productName}</span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-6 text-[#d7dce1]">
            Sistema de contas a pagar e receber para empresas que querem
            organizar o financeiro com clareza.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold">Páginas</p>
          <div className="mt-3 grid gap-2 text-sm text-[#d7dce1]">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold">Suporte</p>
          <a
            href={`mailto:${supportEmail}`}
            className="mt-3 block break-words text-sm text-[#d7dce1] hover:text-white"
          >
            {supportEmail}
          </a>
        </div>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f7f9] text-[#171717]">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  text,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? (
        <p className="text-sm font-bold uppercase text-[#0f766e]">{eyebrow}</p>
      ) : null}
      <h2 className="mt-3 text-3xl font-bold leading-tight text-[#171717] md:text-4xl">
        {title}
      </h2>
      {text ? (
        <p className="mt-4 text-base leading-7 text-[#5b6570] md:text-lg">{text}</p>
      ) : null}
    </div>
  );
}

export function ProductPreview() {
  const screens = [
    {
      title: "Contas a pagar",
      total: "R$ 8.420,00",
      status: "Próximos 7 dias",
      rows: ["Aluguel", "Internet", "Fornecedor"],
      color: "bg-[#0f766e]",
    },
    {
      title: "Fluxo de caixa",
      total: "R$ 18.760,00",
      status: "Saldo previsto",
      rows: ["Entradas", "Saídas", "Reserva"],
      color: "bg-[#2563eb]",
    },
    {
      title: "Relatórios",
      total: "94%",
      status: "Recebimentos em dia",
      rows: ["Clientes", "Categorias", "Resumo"],
      color: "bg-[#b45309]",
    },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {screens.map((screen) => (
        <article
          key={screen.title}
          className="overflow-hidden rounded-lg border border-[#d8dee5] bg-white shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-[#e5e9ed] bg-[#171717] px-4 py-3 text-white">
            <span className="text-sm font-semibold">{screen.title}</span>
            <span className="h-2 w-2 rounded-lg bg-[#34d399]" />
          </div>
          <div className="p-5">
            <p className="text-sm text-[#6b7280]">{screen.status}</p>
            <p className="mt-2 text-3xl font-bold text-[#171717]">{screen.total}</p>
            <div className="mt-5 grid gap-3">
              {screen.rows.map((row, index) => (
                <div
                  key={row}
                  className="grid grid-cols-[1fr_72px] items-center gap-3 text-sm text-[#4b5563]"
                >
                  <span>{row}</span>
                  <span className="h-2 overflow-hidden rounded-lg bg-[#edf1f4]">
                    <span
                      className={`block h-full ${screen.color}`}
                      style={{ width: `${86 - index * 18}%` }}
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function IncludedList({ compact = false }: { compact?: boolean }) {
  return (
    <ul className={`grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
      {planItems.map((item) => (
        <li key={item} className="flex items-start gap-3 text-sm text-[#374151]">
          <span className="mt-1 h-2 w-2 shrink-0 rounded-lg bg-[#0f766e]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PlanPanel({ showActions = true }: { showActions?: boolean }) {
  return (
    <section className="border-y border-[#dfe4e8] bg-white">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-16 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-sm font-bold uppercase text-[#0f766e]">
            {planName}
          </p>
          <h2 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">
            Licença mensal com suporte e atualizações.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#5b6570]">
            Um plano completo, sem complicação, com tudo que a empresa precisa
            para organizar pagamentos, recebimentos e fluxo financeiro.
          </p>
        </div>

        <div className="rounded-lg border border-[#d8dee5] bg-[#f8fafb] p-6 shadow-sm">
          <p className="text-sm font-semibold text-[#5b6570]">{productName}</p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <span className="text-4xl font-bold">{planPrice}</span>
            <span className="pb-1 text-sm font-semibold text-[#5b6570]">
              {planFrequency}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#5b6570]">
            Chave enviada por e-mail ou WhatsApp após a confirmação do pagamento.
          </p>
          {showActions ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/comprar" className="w-full sm:w-auto">
                Comprar agora
              </ButtonLink>
              <ButtonLink href="/download" variant="secondary" className="w-full sm:w-auto">
                Baixar demonstração
              </ButtonLink>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
