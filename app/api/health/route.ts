import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("license_keys").select("id", { count: "exact", head: true });

    if (error) {
      throw error;
    }

    return Response.json({
      status: "ok",
      database: "supabase",
      service: "financepro-license-api",
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno.";
    return Response.json(
      {
        status: "error",
        database: "supabase",
        service: "financepro-license-api",
        message,
      },
      { status: 500 }
    );
  }
}
