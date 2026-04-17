import type { Metadata } from "next";
import Image from "next/image";
import {
  ButtonLink,
  IncludedList,
  PageShell,
  PlanPanel,
  ProductPreview,
  SectionTitle,
  downloadHref,
} from "@/app/_components/site";
import productIcon from "@/assets/icon.png";

export const metadata: Metadata = {
  title: "Sistema de Contas a Pagar e Receber",
  description:
    "Controle contas a pagar, contas a receber, fluxo de caixa e relatórios em um sistema profissional para Windows.",
};

const benefits = [
  {
    title: "Financeiro organizado",
    text: "Pagamentos, recebimentos e categorias em uma rotina simples de acompanhar.",
  },
  {
    title: "Decisão com clareza",
    text: "Fluxo de caixa e relatórios para saber o que entrou, o que saiu e o que vem pela frente.",
  },
  {
    title: "Uso direto no Windows",
    text: "Instalação prática para empresas que preferem um sistema rápido no computador.",
  },
  {
    title: "Licença controlada",
    text: "Ativação por chave, uso em 1 computador e suporte para manter tudo funcionando.",
  },
];

const systemActions = [
  "Cadastrar clientes e fornecedores",
  "Registrar contas a pagar e a receber",
  "Separar lançamentos por categoria",
  "Acompanhar vencimentos e saldos",
  "Gerar relatórios financeiros",
  "Manter backup e atualizações do sistema",
];

const faqs = [
  {
    question: "O plano inclui todos os recursos?",
    answer:
      "Sim. O Plano Profissional inclui contas a pagar, contas a receber, cadastros, categorias, fluxo de caixa, relatórios, backup, atualizações e ativação por chave.",
  },
  {
    question: "Funciona em quantos computadores?",
    answer:
      "A licença é para uso em 1 computador. Para usar em mais máquinas, é preciso contratar licenças adicionais.",
  },
  {
    question: "Posso testar antes de comprar?",
    answer:
      "Sim. Use o botão de download para acessar a demonstração e conhecer o sistema antes da contratação.",
  },
  {
    question: "Como recebo a chave?",
    answer:
      "Depois da confirmação do pagamento, a chave do produto é enviada por e-mail ou WhatsApp.",
  },
];

export default function FinanceiroPage() {
  return (
    <PageShell>
      <section className="relative overflow-hidden border-b border-[#dfe4e8] bg-[#eef3f2]">
        <Image
          src={productIcon}
          alt=""
          width={260}
          height={260}
          priority
          className="absolute right-4 top-10 hidden opacity-10 md:block"
        />
        <div className="mx-auto w-full max-w-6xl px-5 py-16 md:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase text-[#0f766e]">
              Sistema de Contas a Pagar e Receber
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-[#171717] md:text-6xl">
              Controle financeiro simples, elegante e profissional.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#3f4a54]">
              Organize contas a pagar, contas a receber, fluxo de caixa e
              relatórios em um sistema prático para Windows.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/comprar" className="w-full sm:w-auto">
                Comprar agora
              </ButtonLink>
              <ButtonLink href="/download" variant="secondary" className="w-full sm:w-auto">
                Baixar demonstração
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f6f7f9] px-5 py-16" id="beneficios">
        <div className="mx-auto w-full max-w-6xl">
          <SectionTitle
            eyebrow="Benefícios"
            title="Tudo em um fluxo claro para o dia a dia da empresa."
            text="Menos planilhas soltas, menos dúvida sobre vencimentos e mais controle sobre o dinheiro que entra e sai."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => (
              <article
                key={benefit.title}
                className="rounded-lg border border-[#d8dee5] bg-white p-5 shadow-sm"
              >
                <h3 className="text-lg font-bold">{benefit.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#5b6570]">
                  {benefit.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#dfe4e8] bg-white px-5 py-16" id="sistema">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase text-[#0f766e]">
              O que o sistema faz
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">
              Da primeira conta cadastrada ao relatório final do mês.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#5b6570]">
              A proposta é vender um sistema completo, direto e fácil de
              explicar: um plano, uma licença e todos os recursos principais.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {systemActions.map((action) => (
              <div
                key={action}
                className="rounded-lg border border-[#d8dee5] bg-[#f8fafb] p-4 text-sm font-semibold text-[#2f3740]"
              >
                {action}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f6f7f9] px-5 py-16" id="imagens">
        <div className="mx-auto w-full max-w-6xl">
          <SectionTitle
            eyebrow="Imagens do sistema"
            title="Telas pensadas para leitura rápida."
            text="Contas, saldos e relatórios aparecem em blocos claros para facilitar a rotina financeira."
          />
          <div className="mt-10">
            <ProductPreview />
          </div>
        </div>
      </section>

      <PlanPanel />

      <section className="bg-[#f6f7f9] px-5 py-16" id="incluso">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-bold uppercase text-[#0f766e]">
              Incluso no plano
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-tight">
              Um plano só, sem confusão na venda.
            </h2>
          </div>
          <IncludedList />
        </div>
      </section>

      <section className="border-t border-[#dfe4e8] bg-white px-5 py-16" id="duvidas">
        <div className="mx-auto w-full max-w-4xl">
          <SectionTitle eyebrow="Dúvidas frequentes" title="Perguntas rápidas." />
          <div className="mt-10 grid gap-4">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="rounded-lg border border-[#d8dee5] bg-[#f8fafb] p-5"
              >
                <summary className="cursor-pointer text-base font-bold">
                  {faq.question}
                </summary>
                <p className="mt-3 text-sm leading-6 text-[#5b6570]">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/comprar" className="w-full sm:w-auto">
              Comprar agora
            </ButtonLink>
            <ButtonLink href={downloadHref} variant="secondary" className="w-full sm:w-auto">
              Baixar instalador
            </ButtonLink>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
