import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, extensionsTable, type Extension, type AgentConfig, type Client } from "@workspace/db";
import { GenerateConfigParams, GenerateServiceFileParams } from "@workspace/api-zod";

const router = Router();

type ExtensionWithRelations = Extension & {
  agentConfig: AgentConfig | null;
  client: Client | null;
};

type AiProviderKey = "openai" | "elevenlabs" | "gemini" | "deepgram" | "cartesia";

const PROVIDER_ENV_KEYS: Record<AiProviderKey, string> = {
  openai: "OPENAI_API_KEY",
  elevenlabs: "ELEVEN_LABS_API_KEY",
  gemini: "GEMINI_API_KEY",
  deepgram: "DEEPGRAM_API_KEY",
  cartesia: "CARTESIA_API_KEY",
};

function buildConfigJson(ext: ExtensionWithRelations): Record<string, unknown> | null {
  if (!ext.agentConfig) return null;
  const cfg = ext.agentConfig;
  const { sipUsername, sipAuthId, sipPassword, sipDomain, sipServer } = ext;

  const base: Record<string, unknown> = {
    sip: {
      username: sipUsername,
      auth_id: sipAuthId,
      password: sipPassword,
      domain: sipDomain,
      server: sipServer,
    },
    provider: cfg.provider,
  };

  switch (cfg.provider as AiProviderKey) {
    case "openai":
      base["openai"] = {
        api_key: cfg.apiKey,
        model: cfg.modelId ?? "gpt-4o-realtime-preview",
        voice: cfg.voiceId ?? "alloy",
        ...(cfg.systemPrompt ? { system_prompt: cfg.systemPrompt } : {}),
      };
      break;
    case "elevenlabs":
      base["elevenlabs"] = {
        api_key: cfg.apiKey,
        agent_id: cfg.modelId ?? "",
        voice_id: cfg.voiceId ?? "",
        ...(cfg.language ? { language: cfg.language } : {}),
      };
      break;
    case "gemini":
      base["gemini"] = {
        api_key: cfg.apiKey,
        model: cfg.modelId ?? "gemini-2.0-flash-live-001",
        voice: cfg.voiceId ?? "Puck",
        ...(cfg.language ? { language: cfg.language } : {}),
        ...(cfg.systemPrompt ? { system_prompt: cfg.systemPrompt } : {}),
      };
      break;
    case "deepgram":
      base["deepgram"] = {
        api_key: cfg.apiKey,
        voice: cfg.voiceId ?? "aura-asteria-en",
        ...(cfg.language ? { language: cfg.language } : {}),
        ...(cfg.systemPrompt ? { system_prompt: cfg.systemPrompt } : {}),
      };
      break;
    case "cartesia":
      base["cartesia"] = {
        api_key: cfg.apiKey,
        voice_id: cfg.voiceId ?? "",
        model: cfg.modelId ?? "sonic-2",
        ...(cfg.language ? { language: cfg.language } : {}),
        ...(cfg.systemPrompt ? { system_prompt: cfg.systemPrompt } : {}),
      };
      break;
  }

  if (cfg.extraConfig) {
    try {
      const extra = JSON.parse(cfg.extraConfig) as Record<string, unknown>;
      Object.assign(base, extra);
    } catch {
      // ignore invalid JSON
    }
  }

  return base;
}

function buildServiceFile(ext: ExtensionWithRelations): string | null {
  if (!ext.agentConfig) return null;
  const cfg = ext.agentConfig;
  const { extensionNumber, sipUsername, sipAuthId, sipPassword, sipDomain, sipServer } = ext;

  const providerEnvKey = PROVIDER_ENV_KEYS[cfg.provider as AiProviderKey] ?? "AI_API_KEY";

  return `[Unit]
Description=SIP4AI Voice Agent - Extension ${extensionNumber}
After=network.target

[Service]
WorkingDirectory=/opt/sip4ai
Environment=CONFIG_FILE=config.json
Environment=SIP_USERNAME=${sipUsername}
Environment=SIP_AUTH_ID=${sipAuthId}
Environment=SIP_PASSWORD=${sipPassword}
Environment=SIP_DOMAIN=${sipDomain}
Environment=SIP_SERVER=${sipServer}
Environment=${providerEnvKey}=${cfg.apiKey}
ExecStart=/usr/local/bin/sip4ai
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
`;
}

router.get("/generate/:extensionId/config", async (req, res) => {
  const { extensionId } = GenerateConfigParams.parse({ extensionId: Number(req.params.extensionId) });

  const ext = await db.query.extensionsTable.findFirst({
    where: eq(extensionsTable.id, extensionId),
    with: { agentConfig: true, client: true },
  }) as ExtensionWithRelations | undefined;

  if (!ext) {
    res.status(404).json({ error: "Extension not found" });
    return;
  }

  const content = buildConfigJson(ext);
  if (!content) {
    res.status(404).json({ error: "No AI agent config found for this extension" });
    return;
  }

  res.json({
    filename: `config-ext-${ext.extensionNumber}.json`,
    content,
  });
});

router.get("/generate/:extensionId/service", async (req, res) => {
  const { extensionId } = GenerateServiceFileParams.parse({ extensionId: Number(req.params.extensionId) });

  const ext = await db.query.extensionsTable.findFirst({
    where: eq(extensionsTable.id, extensionId),
    with: { agentConfig: true, client: true },
  }) as ExtensionWithRelations | undefined;

  if (!ext) {
    res.status(404).json({ error: "Extension not found" });
    return;
  }

  const content = buildServiceFile(ext);
  if (!content) {
    res.status(404).json({ error: "No AI agent config found for this extension" });
    return;
  }

  res.json({
    filename: `sip4ai-ext-${ext.extensionNumber}.service`,
    content,
  });
});

export default router;
