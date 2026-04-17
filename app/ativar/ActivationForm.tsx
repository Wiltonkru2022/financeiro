"use client";

import { FormEvent, useState } from "react";

export function ActivationForm() {
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(
      "Dados conferidos. Abra o FinancePro no Windows e use este e-mail e esta chave na tela de ativação."
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-[#d8dee5] bg-white p-6 shadow-sm"
    >
      <div className="grid gap-5">
        <label className="grid gap-2 text-sm font-semibold text-[#374151]">
          E-mail
          <input
            type="email"
            name="email"
            required
            placeholder="cliente@empresa.com.br"
            className="min-h-12 rounded-lg border border-[#cfd6dd] bg-white px-4 text-base font-normal outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#99f6e4]"
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-[#374151]">
          Chave do produto
          <input
            type="text"
            name="productKey"
            required
            placeholder="CC-..."
            className="min-h-12 rounded-lg border border-[#cfd6dd] bg-white px-4 text-base font-normal outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#99f6e4]"
          />
        </label>

        <button
          type="submit"
          className="min-h-12 rounded-lg border border-[#0f766e] bg-[#0f766e] px-5 py-3 text-sm font-semibold text-white transition hover:border-[#115e59] hover:bg-[#115e59]"
        >
          Ativar sistema
        </button>
      </div>

      {message ? (
        <p className="mt-5 rounded-lg border border-[#99f6e4] bg-[#ecfdf5] p-4 text-sm leading-6 text-[#14532d]">
          {message}
        </p>
      ) : null}
    </form>
  );
}
