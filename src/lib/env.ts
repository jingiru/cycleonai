export type ServerEnv = {
  NEIS_API_KEY: string;
  SCHOOLINFO_API_KEY: string;
  NEIS_BASE_URL: string;
  SCHOOLINFO_BASE_URL: string;
};

function readRequiredEnv(name: keyof NodeJS.ProcessEnv): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`[env] ${name} is required. Add it to .env.local.`);
  }

  return value;
}

export function getServerEnv(): ServerEnv {
  return {
    NEIS_API_KEY: readRequiredEnv("NEIS_API_KEY"),
    SCHOOLINFO_API_KEY: readRequiredEnv("SCHOOLINFO_API_KEY"),
    NEIS_BASE_URL: process.env.NEIS_BASE_URL || "https://open.neis.go.kr/hub",
    SCHOOLINFO_BASE_URL:
      process.env.SCHOOLINFO_BASE_URL || "https://www.schoolinfo.go.kr/openApi.do",
  };
}

