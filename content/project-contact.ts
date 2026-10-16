import type { CatalogProject } from "./catalog";
import type { Language } from "./projects";

const whatsapp = "https://wa.me/6289513595554";
const email = "mailto:henrynugraha1210@gmail.com";

function draftLinks(subject: string, message: string) {
  const url = new URL(whatsapp);
  url.searchParams.set("text", message);
  return {
    whatsapp: url.href,
    email: `${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`,
  };
}

export function projectContactLinks(project: Pick<CatalogProject, "name" | "link" | "source">, language: Language) {
  const isEn = language === "en";
  const discussion = draftLinks(
    `${isEn ? "Project discussion" : "Diskusi proyek"}: ${project.name}`,
    isEn
      ? `Hi Henry, I saw ${project.name} in your portfolio. I'd like to discuss an idea for a similar project.`
      : `Halo Henry, aku lihat ${project.name} di portofoliomu. Aku ingin diskusi ide untuk proyek serupa.`,
  );
  const walkthrough = draftLinks(
    `Walkthrough: ${project.name}`,
    isEn
      ? `Hi Henry, I saw ${project.name} in your portfolio. I'd like to learn more and request a walkthrough.`
      : `Halo Henry, aku lihat ${project.name} di portofoliomu. Aku ingin tahu lebih lanjut dan minta walkthrough.`,
  );
  // Only replace Henry's existing contact destinations, never a product/source URL.
  const primary = project.link === whatsapp ? walkthrough.whatsapp
    : project.link === email ? discussion.email
    : project.link ?? (project.source ? undefined : walkthrough.email);
  return { ...discussion, primary };
}
