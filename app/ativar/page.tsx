import type { Metadata } from "next";
import { ActivationForm } from "./ActivationForm";
import {
  ButtonLink,
  PageShell,
  productName,
  supportEmail,
} from "@/app/_components/site";

export const metadata: Metadata = {
  title: "Ativar licença",
  description:
    "Informe o e-mail e a chave do produto para ativar o FinancePro.",
};

export default function AtivarPage() {
  return (
    <PageShell>
      <section className="border-b border-[#dfe4e8] bg-white px-5 py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase text-[#0f766e]">
              Ativação
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
              Ativar {productName}
            </h1>
            <p className="mt-5 text-lg leading-8 text-[#5b6570]">
              Use o mesmo e-mail da compra e a chave enviada após a confirmação.
              A ativação final acontece no aplicativo instalado no Windows.
            </p>
            <div className="mt-8">
              <ButtonLink href={`mailto:${supportEmail}`} variant="secondary">
                Falar com suporte
              </ButtonLink>
            </div>
          </div>

          <ActivationForm />
        </div>
      </section>

      <section className="bg-[#f6f7f9] px-5 py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-5 md:grid-cols-3">
          {[
            "Digite o e-mail usado na compra.",
            "Cole a chave do produto sem alterar os caracteres.",
            "Conclua a ativação no computador onde o sistema será usado.",
          ].map((step, index) => (
            <article
              key={step}
              className="rounded-lg border border-[#d8dee5] bg-white p-5 shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0f766e] text-sm font-bold text-white">
                {index + 1}
              </span>
              <p className="mt-4 text-sm font-semibold leading-6 text-[#374151]">
                {step}
              </p>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
