import { projectCatalog } from "./catalog";
import type { OrbitId } from "../components/cosmic-canvas";

export const stackGroups = [
  { label: "Build", items: [["JavaScript", "javascript", "f7df1e"], ["Python", "python", "3776ab"], ["Java", "openjdk", "437291"], ["C#", "csharp", "512bd4"], ["PHP", "php", "777bb4"], ["TypeScript", "typescript", "3178c6"]] },
  { label: "Interface", items: [["React", "react", "61dafb"], ["Next.js", "nextdotjs", "ffffff"], ["HTML", "html5", "e34f26"], ["CSS", "css3", "1572b6"], ["PWA", "pwa", "5a0fc8"], ["MediaPipe", "mediapipe", "0097a7"]] },
  { label: "Systems", items: [["Node.js", "nodedotjs", "339933"], ["n8n", "n8n", "ea4b71"], ["OpenAI", "openai", "ffffff"], ["Laravel", "laravel", "ff2d20"], ["Supabase", "supabase", "3ecf8e"], ["Groq", "groq", "f55036"], ["FastAPI", "fastapi", "009688"], ["WhatsApp", "whatsapp", "25d366"], ["Discord", "discord", "5865f2"]] },
];

export const technologyRegistry = [...stackGroups.flatMap(group => group.items),
  ["MySQL", "mysql", "4479a1"], ["WinForms", "dotnet", "825ce5"],
  ["Android", "android", "3ddc84"], ["PostgreSQL", "postgresql", "4169e1"],
];
export const orbitTechNodes = technologyRegistry.map(([label, slug, color]) => ({
  label, slug, color, projectIds: projectCatalog.filter(project => project.stack.includes(label)).map(project => project.id as OrbitId),
}));
