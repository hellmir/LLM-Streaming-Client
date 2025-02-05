import {useEffect, useRef, useState} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";

interface OptionItem {
    name: string;
    items: string[];
}

const IndexPage = () => {
    const [model, setModel] = useState("mistral");
    const [prompt, setPrompt] = useState("레시피 몇 개 추천해 줘");
    const [optionsArray, setOptionsArray] = useState<OptionItem[]>([
        {name: "식사 유형", items: ["아침"]},
        {name: "요리 유형", items: ["이탈리안"]},
        {name: "재료", items: ["토마토", "밀가루", "양파"]},
        {name: "조리 도구", items: ["프라이팬", "오븐", "믹서기"]},
        {name: "조리 시간", items: ["30분"]},
    ]);
    const [text, setText] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const answerContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && isStreaming) {
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                }
                setIsStreaming(false);
            }
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!isStreaming) {
                    handleSubmit(new Event("submit") as unknown as React.FormEvent);
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isStreaming, prompt]);

    useEffect(() => {
        window.scrollTo(0, document.body.scrollHeight);
    }, [text]);

    const parseOptions = () => {
        const parsed: { [key: string]: string[] } = {};
        optionsArray.forEach((opt) => {
            if (opt.name.trim() !== "") {
                parsed[opt.name.trim()] = opt.items
                    .map((item) => item.trim())
                    .filter((item) => item !== "");
            }
        });
        return parsed;
    };

    const handleOptionNameChange = (index: number, newName: string) => {
        setOptionsArray((prev) => {
            const newArr = [...prev];
            newArr[index].name = newName;
            return newArr;
        });
    };

    const handleOptionItemChange = (
        optionIndex: number,
        itemIndex: number,
        newValue: string
    ) => {
        setOptionsArray((prev) => {
            const newArr = [...prev];
            newArr[optionIndex].items[itemIndex] = newValue;
            return newArr;
        });
    };

    const addOptionItem = (optionIndex: number) => {
        setOptionsArray((prev) => {
            const newArr = [...prev];
            newArr[optionIndex].items.push("");
            return newArr;
        });
    };

    const removeOptionItem = (optionIndex: number, itemIndex: number) => {
        setOptionsArray((prev) => {
            const newArr = [...prev];
            newArr[optionIndex].items.splice(itemIndex, 1);
            return newArr;
        });
    };

    const addOption = () => {
        setOptionsArray((prev) => [...prev, {name: "", items: [""]}]);
    };

    const removeOption = (optionIndex: number) => {
        setOptionsArray((prev) => {
            const newArr = [...prev];
            newArr.splice(optionIndex, 1);
            return newArr;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setText("");
        setIsStreaming(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        const requestBody = {
            secret_key: "abcde",
            template: prompt,
            llm_type: model,
            options: parseOptions(),
        };

        const API_BASE_URL = process.env.NEXT_PUBLIC_SECRET_KEY;
        const REQUEST_ENDPOINT = process.env.NEXT_PUBLIC_REQUEST_ENDPOINT;
        const response = await fetch(`${API_BASE_URL}/${REQUEST_ENDPOINT}`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });

        if (!response.body) {
            setIsStreaming(false);
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let done = false;

        try {
            while (!done) {
                const {value, done: doneReading} = await reader.read();
                done = doneReading;
                const chunk = decoder.decode(value, {stream: !done});
                const lines = chunk.split("\n");
                for (const line of lines) {
                    if (line.startsWith("data:")) {
                        const content = line.startsWith("data: ")
                            ? line.slice("data: ".length)
                            : line.slice("data:".length);
                        if (content === "") {
                            setText((prev) => prev + "\n");
                        } else if (content === " ") {
                            setText((prev) => prev + " ");
                        } else {
                            setText((prev) => prev + content);
                        }
                    }
                }
            }
        } catch (error) {
            console.log("스트리밍 중단:", error);
        }
        setIsStreaming(false);
    };

    const handleButtonClick = () => {
        if (isStreaming) {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            setIsStreaming(false);
        } else {
            handleSubmit(new Event("submit") as unknown as React.FormEvent);
        }
    };

    useEffect(() => {
        window.scrollTo(0, document.body.scrollHeight);
    }, [text]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && isStreaming) {
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                }
                setIsStreaming(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isStreaming]);

    return (
        <div className="max-w-[800px] mx-auto p-5 bg-gray-100 font-sans">
            <div className="flex items-center justify-center mb-5 space-x-4">
                <Image
                    src="/ai.png"
                    alt="서비스 로고"
                    width={60}
                    height={60}
                    className="mb-1"
                />
                <h1 className="text-4xl text-[#2c3e50]">생성형 AI 스트리밍 서비스</h1>
            </div>
            <form
                className="mb-5 bg-white p-4 rounded-lg shadow"
                onSubmit={(e) => e.preventDefault()}
            >
                <div className="mb-3">
                    <label className="font-bold block mb-2">프롬프트:</label>
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="프롬프트를 입력하세요"
                        className="w-full p-2 rounded border border-gray-300 bg-white text-black"
                    />
                </div>
                <div className="mb-3">
                    <label className="font-bold block mb-2">모델 선택:</label>
                    <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full p-2 rounded border border-gray-300 bg-white text-black"
                    >
                        <option value="mistral">Mistral</option>
                        <option value="llama">Llama</option>
                        <option value="clovax">Clovax (테스트 API)</option>
                        <option value="gemini">Gemini (테스트 API)</option>
                        <option value="gpt">GPT (유료 서비스)</option>
                    </select>
                </div>
                <div className="mb-3">
                    <h3 className="mb-3 text-[#2c3e50] font-semibold">옵션 설정</h3>
                    {optionsArray.map((option, optIndex) => (
                        <div
                            key={optIndex}
                            className="border border-gray-300 p-3 mb-3 rounded bg-gray-50"
                        >
                            <div className="flex items-center mb-2">
                                <label className="font-bold mr-2">옵션 이름:</label>
                                <input
                                    type="text"
                                    value={option.name}
                                    onChange={(e) => handleOptionNameChange(optIndex, e.target.value)}
                                    placeholder="옵션 이름 입력"
                                    className="flex-1 p-1.5 border border-gray-300 rounded bg-white text-black"
                                />
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeOption(optIndex);
                                    }}
                                    className="ml-2 bg-red-500 text-white rounded p-1.5 px-2.5 cursor-pointer"
                                >
                                    옵션 삭제
                                </button>
                            </div>
                            <div>
                                <label className="font-bold block mb-2">옵션 항목:</label>
                                {option.items.map((item, itemIndex) => (
                                    <div key={itemIndex} className="flex items-center mb-2">
                                        <input
                                            type="text"
                                            value={item}
                                            onChange={(e) =>
                                                handleOptionItemChange(optIndex, itemIndex, e.target.value)
                                            }
                                            placeholder="옵션 항목 입력"
                                            className="flex-1 p-1.5 border border-gray-300 rounded bg-white text-black"
                                        />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeOptionItem(optIndex, itemIndex);
                                            }}
                                            className="ml-2 bg-orange-500 text-white rounded p-1.5 px-2.5 cursor-pointer"
                                        >
                                            항목 삭제
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        addOptionItem(optIndex);
                                    }}
                                    className="mt-2 bg-green-500 text-white rounded p-1.5 px-2.5 cursor-pointer"
                                >
                                    항목 추가
                                </button>
                            </div>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            addOption();
                        }}
                        className="bg-blue-500 text-white rounded p-2 px-3 cursor-pointer"
                    >
                        옵션 추가
                    </button>
                </div>
                <button
                    type="button"
                    onClick={handleButtonClick}
                    className={`w-full text-white p-2.5 rounded text-lg ${
                        isStreaming ? "bg-red-500" : "bg-blue-500"
                    }`}
                >
                    {isStreaming ? "답변 생성 중지 (ESC)" : "프롬프트 전송 (Enter)"}
                </button>
            </form>
            <hr className="my-5"/>
            <div>
                <h2 className="text-[#2c3e50] mb-2.5 text-xl font-semibold">AI 답변</h2>
                <div
                    ref={answerContainerRef}
                    className="markdown-body"
                    style={{
                        padding: "15px",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        backgroundColor: "#fff",
                        color: "#333",
                    }}
                >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                </div>
            </div>
        </div>
    );
};

export default IndexPage;
