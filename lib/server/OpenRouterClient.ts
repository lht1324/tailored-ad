import OpenAI from "openai";
import { getServerEnv } from "@server/serverEnv";

export enum OpenRouterModel {
    DEEPSEEK_V4_FLASH_0731 = "deepseek/deepseek-v4-flash-0731",
    GEMINI_3_5_FLASH_LITE = "google/gemini-3.5-flash-lite",
    GLM_5_3_FLASH = "z-ai/glm-5.3-flash",
}

export interface CompletionBaseInput {
    // Base
    model: OpenRouterModel;
    systemMessage?: string;
    userMessage: string;
    maxCompletionTokens: number;

    // Optional
    imageBase64List?: string[];
    imageDetail?: "auto" | "low" | "high";
    audioBase64List?: string[];
    reasoning?: boolean;
    temperature?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    /**
     * 지정 시 `json_schema`(strict) 강제. 미지정 시 기존 `json_object`.
     *
     * `json_object`는 "유효한 JSON"만 보장하고 키 이름은 보장하지 않는다.
     * `":headline"` 같은 오염을 막으려면 스키마 강제가 필요하다.
     * 단, strict도 엔드포인트별 지원이라 아래 `require_parameters`를 함께 보낸다.
     */
    responseSchema?: {
        name: string;
        schema: Record<string, unknown>;
    };
}

export class OpenRouterClient {
    private apiKey?: string;
    private readonly OPEN_ROUTER_BASE_URL = "https://openrouter.ai/api/v1";

    constructor() {
        // 키는 첫 호출 시점에 런타임 env에서 로드 (Workers 빌드타임 값 방지)
    }

    private async resolveApiKey(): Promise<string | undefined> {
        if (!this.apiKey) {
            this.apiKey = await getServerEnv('OPENROUTER_API_KEY');
            if (!this.apiKey) {
                console.warn("[openrouter] OPENROUTER_API_KEY is not configured");
            }
        }
        return this.apiKey;
    }

    async createCompletion(input: CompletionBaseInput, location?: string): Promise<string | null> {
        const {
            model,
            systemMessage,
            userMessage,
            maxCompletionTokens,
            imageBase64List,
            imageDetail,
            audioBase64List,
            reasoning,
            temperature,
            presencePenalty,
            frequencyPenalty,
            responseSchema,
        } = input;

        const apiKey = await this.resolveApiKey();
        const client = new OpenAI({
            baseURL: this.OPEN_ROUTER_BASE_URL,
            apiKey: apiKey,
            defaultHeaders: {
                'Connection': 'close',
            }
        });

        const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
            { type: "text", text: userMessage }
        ];

        if (imageBase64List && imageBase64List.length > 0) {
            // 변환 성공한 이미지만 Payload에 추가
            imageBase64List.forEach((base64Str, index) => {
                if (base64Str) {
                    userContent.push({
                        type: "image_url",
                        image_url: {
                            url: `data:image/png;base64,${base64Str}`, // [!code highlight] 이제 URL이 아닌 Base64 Data URI가 들어갑니다
                            detail: imageDetail ?? "auto",
                        }
                    });
                } else {
                    console.warn(`[openrouter] skipping failed image at index ${index}`);
                }
            });
        }

        if (audioBase64List && audioBase64List.length > 0) {
            audioBase64List.forEach((base64Str, index) => {
                if (base64Str) {
                    userContent.push({ type: "text", text: `Track ${index}:` });
                    userContent.push({
                        type: "input_audio",
                        input_audio: {
                            data: base64Str, // Audio data must be raw base64 without prefix
                            format: "mp3"
                        }
                    });
                } else {
                    console.warn(`[openrouter] skipping failed audio at index ${index}`);
                }
            });
        }

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            ...(!!systemMessage ? [{ role: 'system' as const, content: systemMessage }] : []),
            {
                role: 'user' as const,
                content: userContent
            }
        ];

        const responseFormat = responseSchema
            ? {
                type: "json_schema" as const,
                json_schema: {
                    name: responseSchema.name,
                    strict: true,
                    schema: responseSchema.schema,
                },
            }
            : { type: "json_object" as const };

        const completion = await client.chat.completions.create({
            model: model,
            messages: messages,
            response_format: responseFormat,
            max_completion_tokens: maxCompletionTokens,

            // @ts-expect-error: OpenRouter specific parameter not in OpenAI SDK types
            reasoning: { enabled: reasoning === true },
            provider: {
                // 스키마 강제를 지원하는 엔드포인트로만 라우팅한다 (지원은 엔드포인트별)
                ...(responseSchema ? { require_parameters: true } : {}),
                sort: {
                    by: 'throughput',
                    partition: 'none',
                },
            },
            temperature: temperature,
            presence_penalty: presencePenalty,
            frequency_penalty: frequencyPenalty,
        }, {
            headers: {
                'HTTP-Referer': `${await getServerEnv('BASE_URL')}${location ? `?location=${location?.replaceAll(' ', '_')}` : ""}`,
                'X-Title': location ?? 'Unknown',
            }
        });

        if (completion.choices[0]?.message?.content) {
            return completion.choices[0]?.message?.content;
        } else {
            console.debug(`[openrouter] raw completion: ${JSON.stringify(completion)}`);
            return ''
        }
    }
}