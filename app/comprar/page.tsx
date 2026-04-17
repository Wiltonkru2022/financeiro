import type { Metadata } from "next";
import {
  ButtonLink,
  IncludedList,
  PageShell,
  PlanPanel,
  planFrequency,
  planName,
  planPrice,
  productName,
  purchaseHref,
} from "@/app/_components/site";

export const metadata: Metadata = {
  title: "Comprar",
  description:
    "Compre a licença profissional do FinancePro com suporte e atualizações.",
};

export default function ComprarPage() {
  return (
    <PageShell>
      <section className="border-b border-[#dfe4e8] bg-white px-5 py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase text-[#0f766e]">
              Compra simples
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
              {planName}
            </h1>
            <p className="mt-5 text-lg leading-8 text-[#5b6570]">
              Controle completo de contas a pagar e receber em um sistema
              elegante, rápido e fácil de usar.
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
            <p className="mt-4 text-sm leading-6 text-[#5b6570]">
              Licença mensal com suporte, atualizações e uso em 1 computador.
            </p>
            <div className="mt-6">
              <ButtonLink href={purchaseHref} className="w-full">
                Pagar agora
              </ButtonLink>
            </div>
            <p className="mt-4 text-xs leading-5 text-[#6b7280]">
              A chave do produto é enviada por e-mail ou WhatsApp após a
              confirmação do pagamento.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#f6f7f9] px-5 py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-bold uppercase text-[#0f766e]">
              O que está incluso
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-tight">
              Um pacote completo para vender sem explicar vários planos.
            </h2>
          </div>
          <IncludedList />
        </div>
      </section>

      <PlanPanel showActions={false} />

      <section className="bg-[#f6f7f9] px-5 py-16">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 rounded-lg border border-[#d8dee5] bg-white p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-[#0f766e]">
              Depois da compra
            </p>
            <h2 className="mt-2 text-2xl font-bold">Baixe, instale e ative.</h2>
            <p className="mt-2 text-sm leading-6 text-[#5b6570]">
              O cliente recebe a chave, acessa o download e ativa o sistema no
              computador.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/download" variant="secondary" className="w-full sm:w-auto">
              Ir para download
            </ButtonLink>
            <ButtonLink href="/ativar" className="w-full sm:w-auto">
              Ativar licença
            </ButtonLink>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
