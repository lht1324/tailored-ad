import OpenAI from "openai";

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
}

export class OpenRouterClient {
    private readonly apiKey?: string;
    private readonly OPEN_ROUTER_BASE_URL = "https://openrouter.ai/api/v1";

    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;

        if (!this.apiKey) {
            console.warn('FAL_AI_API_KEY not found in environment variables');
        }
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
        } = input;

        const client = new OpenAI({
            baseURL: this.OPEN_ROUTER_BASE_URL,
            apiKey: this.apiKey,
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
                    console.warn(`Skipping failed image: ${imageBase64List[index]}`);
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
                    console.warn(`Skipping failed audio at index: ${index}`);
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

        const completion = await client.chat.completions.create({
            model: model,
            messages: messages,
            response_format: { type: "json_object" },
            max_completion_tokens: maxCompletionTokens,

            // @ts-expect-error: OpenRouter specific parameter not in OpenAI SDK types
            reasoning: { enabled: reasoning === true },
            provider: {
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
                'HTTP-Referer': `${process.env.BASE_URL}${location ? `?location=${location?.replaceAll(' ', '_')}` : ""}`,
                'X-Title': location ?? 'Unknown',
            }
        });

        if (completion.choices[0]?.message?.content) {
            return completion.choices[0]?.message?.content;
        } else {
            console.log(`Raw completion: ${JSON.stringify(completion)}`);
            return ''
        }
    }
}