import type { Metadata } from "next";
import {
  ButtonLink,
  PageShell,
  ProductPreview,
  SectionTitle,
  downloadHref,
  productName,
  supportEmail,
} from "@/app/_components/site";

export const metadata: Metadata = {
  title: "Download",
  description:
    "Baixe o instalador do FinancePro e veja os requisitos para instalar no Windows.",
};

const requirements = [
  "Windows 10 ou Windows 11",
  "Processador dual-core ou superior",
  "4 GB de memória RAM",
  "300 MB livres para instalação",
  "Conexão com a internet para ativação e atualizações",
];

const installSteps = [
  "Baixe o instalador.",
  "Execute o arquivo no Windows.",
  "Siga as etapas da instalação.",
  "Abra o sistema e ative com seu e-mail e chave do produto.",
];

export default function DownloadPage() {
  return (
    <PageShell>
      <section className="border-b border-[#dfe4e8] bg-white px-5 py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase text-[#0f766e]">
              Baixar sistema
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
              {productName}
            </h1>
            <p className="mt-5 text-lg leading-8 text-[#5b6570]">
              Versão atual: 1.0.0. Compatível com Windows 10 e 11.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={downloadHref} className="w-full sm:w-auto">
                Baixar instalador
              </ButtonLink>
              <ButtonLink href="/ativar" variant="secondary" className="w-full sm:w-auto">
                Ativar licença
              </ButtonLink>
            </div>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section className="bg-[#f6f7f9] px-5 py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-2">
          <div>
            <SectionTitle
              eyebrow="Requisitos mínimos"
              title="Pronto para empresas que usam Windows."
              text="Confira o básico antes de instalar."
            />
            <ul className="mt-8 grid gap-3">
              {requirements.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-[#d8dee5] bg-white p-4 text-sm font-semibold text-[#374151]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SectionTitle
              eyebrow="Instalação"
              title="Instale, abra e ative."
              text="A chave do produto é vinculada ao computador durante a ativação."
            />
            <ol className="mt-8 grid gap-3">
              {installSteps.map((step, index) => (
                <li
                  key={step}
                  className="grid grid-cols-[40px_1fr] items-center gap-4 rounded-lg border border-[#d8dee5] bg-white p-4 text-sm font-semibold text-[#374151]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0f766e] text-white">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="border-t border-[#dfe4e8] bg-white px-5 py-16">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 rounded-lg border border-[#d8dee5] bg-[#171717] p-6 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-[#5eead4]">
              Suporte
            </p>
            <h2 className="mt-2 text-2xl font-bold">Precisa de ajuda para instalar?</h2>
            <p className="mt-2 text-sm leading-6 text-[#d7dce1]">
              Fale com o suporte e informe seu e-mail de compra.
            </p>
          </div>
          <ButtonLink href={`mailto:${supportEmail}`} variant="light" className="w-full md:w-auto">
            Falar com suporte
          </ButtonLink>
        </div>
      </section>
    </PageShell>
  );
}
