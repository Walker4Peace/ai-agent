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
  const { sipUsername, sipAuthId, sipPassword } = ext;
  // SIP domain and server come from the linked IPBX (client), not the extension
  const sipDomain = ext.client?.sipDomain ?? "";
  const sipServer = ext.client?.sipServer ?? "";

  const base: Record<string, unknown> = {
    mode: cfg.mode ?? "inbound",
    provider: cfg.provider,
    sip: {
      username: sipUsername,
      auth_id: sipAuthId,
      password: sipPassword,
      domain: sipDomain,
      server: sipServer,
    },
  };

  // API keys are NOT embedded in config.json — they are passed via environment
  // variables (ELEVEN_LABS_API_KEY, OPENAI_API_KEY, etc.) by the service runner.
  switch (cfg.provider as AiProviderKey) {
    case "openai":
      base["openai"] = {
        ...(cfg.modelId ? { model: cfg.modelId } : { model: "gpt-4o-realtime-preview" }),
        voice: cfg.voiceId ?? "alloy",
        ...(cfg.systemPrompt ? { instructions: cfg.systemPrompt } : {}),
        ...(cfg.greeting ? { greeting: cfg.greeting } : {}),
      };
      break;
    case "elevenlabs":
      base["elevenlabs"] = {
        agent_id: cfg.modelId ?? "",
        ...(cfg.greeting ? { first_message: cfg.greeting } : {}),
        ...(cfg.systemPrompt ? { system_prompt: cfg.systemPrompt } : {}),
      };
      break;
    case "gemini":
      base["gemini"] = {
        model: cfg.modelId ?? "gemini-2.0-flash-live-001",
        voice: cfg.voiceId ?? "Puck",
        ...(cfg.language ? { language: cfg.language } : {}),
        ...(cfg.systemPrompt ? { system_prompt: cfg.systemPrompt } : {}),
        ...(cfg.greeting ? { greeting: cfg.greeting } : {}),
      };
      break;
    case "deepgram":
      base["deepgram"] = {
        model: cfg.modelId ?? "aura-2-thalia-en",
        ...(cfg.voiceId ? { listen_model: cfg.voiceId } : {}),
        ...(cfg.systemPrompt ? { system_prompt: cfg.systemPrompt } : {}),
        ...(cfg.language ? { language: cfg.language } : {}),
      };
      break;
    case "cartesia":
      base["cartesia"] = {
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
  const { extensionNumber, sipUsername, sipAuthId, sipPassword } = ext;
  // SIP domain and server come from the linked IPBX (client), not the extension
  const sipDomain = ext.client?.sipDomain ?? "";
  const sipServer = ext.client?.sipServer ?? "";

  const providerEnvKey = PROVIDER_ENV_KEYS[cfg.provider as AiProviderKey] ?? "AI_API_KEY";
  // Each extension uses its own config file path so multiple systemd services
  // can run simultaneously without overwriting each other's config.json.
  // WorkingDirectory stays at the always-present parent; the per-extension
  // config directory is created by ExecStartPre before the process starts.
  const configDir = `/opt/sip4ai/ext-${extensionNumber}`;
  const configPath = `${configDir}/config.json`;

  return `[Unit]
Description=SIP4AI Voice Agent - Extension ${extensionNumber}
After=network.target

[Service]
WorkingDirectory=/opt/sip4ai
ExecStartPre=/bin/mkdir -p ${configDir}
Environment=CONFIG_FILE=${configPath}
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
