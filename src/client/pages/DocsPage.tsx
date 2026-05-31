import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const sections = [
  { id: "resumen", label: "Resumen ejecutivo" },
  { id: "problema", label: "Problema que aborda" },
  { id: "como-funciona", label: "Cómo funciona" },
  { id: "arquitectura", label: "Arquitectura" },
  { id: "capas", label: "Capas principales" },
  { id: "vibe-json", label: "Estándar Vibe-JSON" },
  { id: "api", label: "API por intenciones" },
  { id: "veef", label: "Marco VEEF" },
  { id: "stack", label: "Stack tecnológico" },
  { id: "academico", label: "Contexto académico" },
  { id: "quick-start", label: "Inicio rápido" },
  { id: "builder", label: "Builder y chats" },
] as const;

const ARCHITECTURE_DIAGRAM = `Intención (Lenguaje Natural)
        │
        ▼
┌─────────────────┐
│ Schema Generator │  ← Vercel AI SDK + LLM (Claude/Gemini vía OpenRouter)
│ (Compilador LLM) │     + Autocorrección recursiva (≤3 intentos)
└────────┬────────┘
         │ vibe_schema_v1
         ▼
┌─────────────────┐
│    Validator     │  ← Zod (Deterministic Compiler Shell)
└────────┬────────┘
         │ Esquema validado
         ▼
┌─────────────────┐     ┌──────────────────────────┐
│   Vibe Parser   │────▶│  PostgreSQL JSONB Store   │
│ (Runtime)       │     │  vibe_modules · vibe_records │
└────────┬────────┘     └──────────────────────────┘
         │
         ├──────────────────────────────────┐
         ▼                                  ▼
┌─────────────────┐              ┌─────────────────┐
│ Action Executor │              │ Automation Engine│
│ (Motor)         │              │ (trigger→action) │
└────────┬────────┘              └─────────────────┘
         │
         ▼
┌─────────────────┐
│  SDUI Renderer  │  ← Component Factory (Table, Form, Detail, Card)
└────────┬────────┘
         │ Componentes React
         ▼
    Aplicación renderizada`;

export function DocsPage() {
  return (
    <div className="vibe-page-gradient mx-auto max-w-6xl px-6 py-10 lg:py-14">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="secondary" className="mb-3">
            <BookOpen className="mr-1 size-3" />
            Documentación
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            VibeOS
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Plataforma empresarial open source orientada a metadatos que compila
            intención en lenguaje natural en aplicaciones funcionales.
          </p>
        </div>
        <Button render={<Link to="/builder" />}>
          Abrir Builder
          <ArrowRight className="size-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-10 lg:flex-row lg:gap-14">
        <nav className="hidden shrink-0 lg:block lg:w-52">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            En esta página
          </p>
          <ul className="sticky top-20 max-h-[calc(100vh-6rem)] space-y-0.5 overflow-y-auto">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1 space-y-14">
          <DocSection id="resumen" title="Resumen ejecutivo">
            <p>
              <strong className="text-foreground">VibeOS (VibeOSS)</strong> es una
              plataforma empresarial open source, orientada a metadatos, que compila
              intención expresada en lenguaje natural en aplicaciones funcionales en
              tiempo de ejecución. En lugar de configurar manualmente modelos de
              datos, interfaces y APIs en un sistema propietario (como Salesforce),
              el usuario describe lo que necesita —por ejemplo,{" "}
              <em>«un CRM con contactos, oportunidades y pipeline de ventas»</em>— y
              la plataforma genera automáticamente el esquema, la persistencia, la API
              y la interfaz de usuario.
            </p>
            <Card className="mt-4 border-primary/20 bg-primary/5">
              <CardContent className="pt-5 text-sm leading-relaxed">
                Este repositorio constituye el prototipo funcional desarrollado en el
                marco del Trabajo de Fin de Grado (TFG){" "}
                <em>
                  Developing and Evaluating a Functional Prototype of an Agentic AI
                  Programmer for Enterprise Software
                </em>
                , en La Salle — Universitat Ramon Llull (Barcelona, 2025–2026).
              </CardContent>
            </Card>
          </DocSection>

          <Separator />

          <DocSection id="problema" title="Problema que aborda">
            <p>
              Las plataformas empresariales tradicionales obligan al usuario a traducir
              su lógica de negocio al lenguaje del sistema: clics, configuraciones y
              código propietario. VibeOS invierte este enfoque mediante el paradigma de{" "}
              <strong className="text-foreground">Vibe Coding</strong>: los metadatos
              actúan como interfaz universal entre la intención humana y el software
              ejecutable.
            </p>
            <DocTable
              headers={["Aspecto", "Plataformas tradicionales", "VibeOS"]}
              rows={[
                [
                  "Definición del modelo de datos",
                  "Configuración manual campo a campo",
                  "Descripción en lenguaje natural",
                ],
                [
                  "Construcción de la UI",
                  "Editores visuales, layouts, tipos de registro",
                  "La UI se deriva del esquema (SDUI)",
                ],
                [
                  "Tiempo hasta la primera app",
                  "Días o semanas",
                  "Minutos",
                ],
                ["Vendor lock-in", "Alto", "Ninguno (open source, self-hosted)"],
              ]}
            />
          </DocSection>

          <Separator />

          <DocSection id="como-funciona" title="Cómo funciona">
            <p>El flujo principal sigue tres fases:</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <PhaseCard
                step="01"
                title="Describir"
                text="El usuario escribe en lenguaje natural qué aplicación necesita (CRM, gestor de proyectos, inventario, etc.) desde el Builder (/builder)."
              />
              <PhaseCard
                step="02"
                title="Compilar"
                text="El kernel procesa la intención mediante un LLM, produce un documento Vibe-JSON (vibe_schema_v1), lo valida con Zod y, si es necesario, aplica autocorrección recursiva (hasta 3 intentos)."
              />
              <PhaseCard
                step="03"
                title="Renderizar"
                text="El motor de runtime interpreta el esquema, persiste los datos en PostgreSQL (JSONB) y el renderizador SDUI construye la interfaz dinámicamente: tablas, formularios, vistas de detalle, etc."
              />
            </div>
          </DocSection>

          <Separator />

          <DocSection id="arquitectura" title="Arquitectura del sistema">
            <CodeBlock title="Pipeline completo" code={ARCHITECTURE_DIAGRAM} />
          </DocSection>

          <Separator />

          <DocSection id="capas" title="Capas principales">
            <DocTable
              headers={["Capa", "Responsabilidad"]}
              rows={[
                [
                  "Cliente (React SPA)",
                  "Landing, autenticación, Builder con chat y preview interactivo",
                ],
                [
                  "API (Hono)",
                  "Enrutamiento basado en intents: generate, validate, query, mutate, list, getChat",
                ],
                [
                  "Kernel",
                  "Generación de esquemas con LLM, validación Zod, parser de metadatos, autocorrección",
                ],
                [
                  "Engine",
                  "Ejecución de acciones y reglas de automatización (email, webhook, Slack)",
                ],
                [
                  "Persistencia",
                  "PostgreSQL con JSONB para esquemas (vibe_modules), registros (vibe_records) y chats (vibe_chats)",
                ],
                [
                  "SDUI",
                  "Renderizado server-driven: el esquema define qué componente mostrar y con qué datos",
                ],
              ]}
            />
          </DocSection>

          <Separator />

          <DocSection id="vibe-json" title="Estándar Vibe-JSON (vibe_schema_v1)">
            <p>
              Toda aplicación en VibeOS se describe con un único documento JSON que
              incluye cuatro bloques obligatorios:
            </p>
            <ul className="docs-list mt-4 !list-disc">
              <li>
                <strong>entities</strong> — Modelo de datos (entidades, campos,
                tipos, relaciones, validaciones).
              </li>
              <li>
                <strong>views</strong> — Configuración de la UI (tablas, formularios,
                layouts SDUI).
              </li>
              <li>
                <strong>actions</strong> — Operaciones de negocio (CRUD, exportación,
                transiciones de estado).
              </li>
              <li>
                <strong>automations</strong> — Reglas event-driven (trigger → condición
                → acción).
              </li>
            </ul>
            <p className="mt-4">
              La especificación formal está en{" "}
              <code className="docs-code">docs/architecture/metadata-spec.yaml</code> y
              la implementación de referencia en{" "}
              <code className="docs-code">src/shared/schemas/vibe-schema-v1.ts</code>{" "}
              (Zod).
            </p>
            <CodeBlock
              title="Ejemplo mínimo"
              code={`{
  "version": "1.0.0",
  "module": "solar-leads",
  "description": "Track solar energy leads",
  "entities": [{
    "name": "solar_lead",
    "label": "Solar Lead",
    "pluralLabel": "Solar Leads",
    "fields": [
      { "name": "name", "label": "Name", "type": "text", "required": true },
      { "name": "email", "label": "Email", "type": "email", "required": true }
    ],
    "timestamps": true,
    "softDelete": false
  }],
  "views": [{
    "name": "solar_lead_table",
    "label": "Leads",
    "entity": "solar_lead",
    "layout": { "type": "table", "columns": ["name", "email"] }
  }],
  "actions": [],
  "automations": []
}`}
            />
          </DocSection>

          <Separator />

          <DocSection id="api" title="API basada en intenciones">
            <p>
              El endpoint central{" "}
              <code className="docs-code">POST /api/vibe</code> acepta peticiones con
              un campo <code className="docs-code">intent</code>:
            </p>
            <DocTable
              headers={["Intent", "Función"]}
              rows={[
                [
                  "generate",
                  "NL → esquema vibe_schema_v1; validación; persistencia en BD; soporte de chats iterativos",
                ],
                ["validate", "Validación Zod de un esquema existente"],
                ["query", "Lectura de registros con filtros y paginación"],
                ["mutate", "Creación, actualización o borrado lógico de registros"],
                ["list", "Listado de sesiones de chat guardadas"],
                ["getChat", "Carga de mensajes y esquema vinculado a un chat"],
              ]}
            />
            <p className="mt-4">
              Rutas adicionales:{" "}
              <code className="docs-code">/api/vibe/execute</code> (acciones),{" "}
              <code className="docs-code">/api/vibe/automate</code> (automatizaciones),{" "}
              <code className="docs-code">/api/vibe/providers</code> (integraciones
              externas).
            </p>
            <CodeBlock
              title="POST /api/vibe"
              code={`{
  "intent": "generate" | "query" | "mutate" | "validate" | "list" | "getChat",
  "payload": { ... }
}`}
            />
          </DocSection>

          <Separator />

          <DocSection id="veef" title="Marco de evaluación (VEEF)">
            <p>
              VibeOS incluye el{" "}
              <strong className="text-foreground">
                VibeOS Enterprise Evaluation Framework (VEEF)
              </strong>{" "}
              para medir empíricamente la calidad del prototipo. Las métricas
              evaluadas son:
            </p>
            <DocTable
              headers={["Métrica", "Descripción"]}
              rows={[
                ["SV (Schema Validity)", "Validez del esquema generado"],
                ["DBI (Database Integrity)", "Integridad de la persistencia"],
                ["URC (UI Render Consistency)", "Consistencia del renderizado SDUI"],
                ["CE (Constraint Enforcement)", "Cumplimiento de restricciones de negocio"],
              ]}
            />
            <p className="mt-4">
              El benchmark ejecuta tareas T1–T5 (generación de esquema, mapeo UI,
              relaciones, restricciones, módulo E2E) 10 veces cada una, registrando
              latencia, intentos de autocorrección y tasas de éxito (DVR). Scripts en{" "}
              <code className="docs-code">scripts/run-benchmark.ts</code>.
            </p>
          </DocSection>

          <Separator />

          <DocSection id="stack" title="Stack tecnológico">
            <DocTable
              headers={["Componente", "Tecnología"]}
              rows={[
                ["Frontend", "React 19, Vite 6, React Router, Tailwind CSS v4, Shadcn/UI"],
                ["Backend", "Hono 4 (Node.js; portable a Bun, Cloudflare Workers, Vercel)"],
                ["Lenguaje", "TypeScript (modo estricto)"],
                ["Base de datos", "PostgreSQL con JSONB (compatible con Supabase)"],
                ["ORM", "Drizzle ORM"],
                ["IA", "Vercel AI SDK — OpenRouter o Anthropic directo"],
                ["Validación", "Zod"],
                ["Integraciones", "Email (Resend), Webhook HTTP, Slack"],
                ["Tests", "Vitest"],
              ]}
            />
          </DocSection>

          <Separator />

          <DocSection id="academico" title="Contexto académico">
            <p>
              Este repositorio es la evidencia empírica del TFG. Las afirmaciones
              comparativas del README (p. ej. velocidad frente a Salesforce) representan
              la visión arquitectónica del proyecto y se contextualizan con datos
              empíricos recogidos mediante VEEF en el documento académico.
            </p>
            <Card className="mt-4">
              <CardContent className="grid gap-3 pt-5 text-sm sm:grid-cols-2">
                <InfoRow label="Institución" value="La Salle — Universitat Ramon Llull" />
                <InfoRow label="Licencia" value="MIT" />
                <InfoRow
                  label="Repositorio"
                  value={
                    <a
                      href="https://github.com/Hugongra/VibeOSS"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="docs-link"
                    >
                      github.com/Hugongra/VibeOSS
                    </a>
                  }
                />
                <InfoRow label="Periodo" value="Barcelona, 2025–2026" />
              </CardContent>
            </Card>
          </DocSection>

          <Separator />

          <DocSection id="quick-start" title="Inicio rápido">
            <ol className="docs-list">
              <li>
                Copia <code className="docs-code">.env.example</code> a{" "}
                <code className="docs-code">.env.local</code> y configura{" "}
                <code className="docs-code">DATABASE_URL</code> y{" "}
                <code className="docs-code">OPENROUTER_API_KEY</code>.
              </li>
              <li>
                Inicia PostgreSQL (
                <code className="docs-code">docker compose up -d</code>) y ejecuta
                migraciones: <code className="docs-code">npm run db:migrate</code>.
              </li>
              <li>
                Arranca ambos servidores:{" "}
                <code className="docs-code">npm run dev:all</code> (frontend{" "}
                <code className="docs-code">:5173</code>, API{" "}
                <code className="docs-code">:3001</code>).
              </li>
              <li>
                Inicia sesión, abre el{" "}
                <Link to="/builder" className="docs-link">
                  Builder
                </Link>{" "}
                y describe tu app — p. ej.{" "}
                <em>Crea un CRM con contactos y oportunidades</em>.
              </li>
            </ol>
          </DocSection>

          <Separator />

          <DocSection id="builder" title="Builder y chats">
            <p>
              El Builder se divide en tres áreas: barra lateral de chats, panel de
              conversación y preview en vivo de la aplicación generada.
            </p>
            <ul className="docs-list mt-4 !list-disc">
              <li>
                <strong>Nuevo chat</strong> — inicia una conversación y esquema
                independientes.
              </li>
              <li>
                <strong>Mensajes de seguimiento</strong> — modifican el mismo módulo
                (añadir campos, entidades, automatizaciones) sin duplicados.
              </li>
              <li>
                <strong>Panel preview</strong> — tablas y formularios interactivos;
                los registros persisten vía intent <code className="docs-code">mutate</code>.
              </li>
            </ul>
            <Card className="mt-4 border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <MessageSquare className="size-4 text-primary" />
                  Ejemplo de iteración
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Tú:</span> Crea una
                  entidad SolarLead con Name, Email, Date, Status y Currency
                </p>
                <p>
                  <span className="font-medium text-foreground">Tú:</span> Añade un
                  campo Phone y cambia Status a New, Contacted, Won, Lost
                </p>
                <p>
                  <span className="font-medium text-primary">VibeOS:</span> Actualiza
                  el mismo módulo y refresca el preview.
                </p>
              </CardContent>
            </Card>
          </DocSection>
        </div>
      </div>
    </div>
  );
}

function DocSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground [&_p]:text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function PhaseCard({
  step,
  title,
  text,
}: {
  step: string;
  title: string;
  text: string;
}) {
  return (
    <Card className="border-border/80 bg-card/80">
      <CardContent className="pt-5">
        <span className="font-mono text-xs text-primary">{step}</span>
        <p className="mt-2 text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}

function DocTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | ReactNode)[][];
}) {
  return (
    <div className="docs-table-wrap">
      <table className="docs-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className={j === 0 ? "font-medium text-foreground" : ""}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-foreground">{value}</p>
    </div>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-border bg-muted/30">
      <div className="border-b border-border px-4 py-2">
        <p className="font-mono text-xs text-muted-foreground">{title}</p>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-foreground">
        {code}
      </pre>
    </div>
  );
}
