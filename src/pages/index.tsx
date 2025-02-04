import {useRef, useState} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface OptionItem {
    name: string;
    items: string[];
}

const IndexPage = () => {
    const [model, setModel] = useState("mistral");
    const [prompt, setPrompt] = useState("레시피 추천해 줘");
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

        const API_BASE_URL = "https://hyobin-llm.duckdns.org";
        const response = await fetch(`${API_BASE_URL}/streaming/sse`, {
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

    return (
        <div
            style={{
                maxWidth: "800px",
                margin: "0 auto",
                padding: "20px",
                fontFamily: "Arial, sans-serif",
                backgroundColor: "#f7f7f7",
            }}
        >
            <h1
                style={{
                    textAlign: "center",
                    color: "#2c3e50",
                    marginBottom: "20px",
                }}
            >
                생성형 AI 스트리밍 서비스
            </h1>
            <form
                onSubmit={handleSubmit}
                style={{
                    marginBottom: "20px",
                    backgroundColor: "#fff",
                    padding: "15px",
                    borderRadius: "8px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
            >
                <div style={{marginBottom: "10px"}}>
                    <label
                        style={{
                            fontWeight: "bold",
                            display: "block",
                            marginBottom: "5px",
                        }}
                    >
                        프롬프트:
                    </label>
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="프롬프트를 입력하세요"
                        style={{
                            width: "100%",
                            padding: "8px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            backgroundColor: "#fff",
                            color: "#000",
                        }}
                    />
                </div>
                <div style={{marginBottom: "10px"}}>
                    <label
                        style={{
                            fontWeight: "bold",
                            display: "block",
                            marginBottom: "5px",
                        }}
                    >
                        모델 선택:
                    </label>
                    <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "8px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            backgroundColor: "#fff",
                            color: "#000",
                        }}
                    >
                        <option value="mistral">Mistral</option>
                        <option value="llama">Llama</option>
                        <option value="clovax">Clovax (테스트 API)</option>
                        <option value="gemini">Gemini (테스트 API)</option>
                        <option value="gpt">GPT (유료 서비스)</option>
                    </select>
                </div>
                <div style={{marginBottom: "10px"}}>
                    <h3 style={{marginBottom: "10px", color: "#2c3e50"}}>
                        옵션 설정
                    </h3>
                    {optionsArray.map((option, optIndex) => (
                        <div
                            key={optIndex}
                            style={{
                                border: "1px solid #ccc",
                                padding: "10px",
                                marginBottom: "10px",
                                borderRadius: "4px",
                                backgroundColor: "#fafafa",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    marginBottom: "8px",
                                }}
                            >
                                <label
                                    style={{
                                        fontWeight: "bold",
                                        marginRight: "8px",
                                    }}
                                >
                                    옵션 이름:
                                </label>
                                <input
                                    type="text"
                                    value={option.name}
                                    onChange={(e) =>
                                        handleOptionNameChange(optIndex, e.target.value)
                                    }
                                    placeholder="옵션 이름 입력"
                                    style={{
                                        flex: "1",
                                        padding: "6px",
                                        border: "1px solid #ccc",
                                        borderRadius: "4px",
                                        backgroundColor: "#fff",
                                        color: "#000",
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeOption(optIndex);
                                    }}
                                    style={{
                                        marginLeft: "8px",
                                        backgroundColor: "#e74c3c",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "4px",
                                        padding: "6px 10px",
                                        cursor: "pointer",
                                    }}
                                >
                                    옵션 삭제
                                </button>
                            </div>
                            <div>
                                <label
                                    style={{
                                        fontWeight: "bold",
                                        display: "block",
                                        marginBottom: "5px",
                                    }}
                                >
                                    옵션 항목:
                                </label>
                                {option.items.map((item, itemIndex) => (
                                    <div
                                        key={itemIndex}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            marginBottom: "5px",
                                        }}
                                    >
                                        <input
                                            type="text"
                                            value={item}
                                            onChange={(e) =>
                                                handleOptionItemChange(optIndex, itemIndex, e.target.value)
                                            }
                                            placeholder="옵션 항목 입력"
                                            style={{
                                                flex: "1",
                                                padding: "6px",
                                                border: "1px solid #ccc",
                                                borderRadius: "4px",
                                                backgroundColor: "#fff",
                                                color: "#000",
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeOptionItem(optIndex, itemIndex);
                                            }}
                                            style={{
                                                marginLeft: "8px",
                                                backgroundColor: "#e67e22",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: "4px",
                                                padding: "6px 10px",
                                                cursor: "pointer",
                                            }}
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
                                    style={{
                                        backgroundColor: "#2ecc71",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "4px",
                                        padding: "6px 10px",
                                        cursor: "pointer",
                                        marginTop: "5px",
                                    }}
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
                        style={{
                            backgroundColor: "#3498db",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            padding: "8px 12px",
                            cursor: "pointer",
                        }}
                    >
                        옵션 추가
                    </button>
                </div>
                <button
                    type="button"
                    onClick={handleButtonClick}
                    style={{
                        backgroundColor: isStreaming ? "#e74c3c" : "#3498db",
                        color: "#fff",
                        padding: "10px 20px",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "16px",
                        width: "100%",
                    }}
                >
                    {isStreaming ? "답변 생성 중지" : "프롬프트 전송"}
                </button>
            </form>
            <hr style={{margin: "20px 0"}}/>
            <div>
                <h2 style={{color: "#2c3e50", marginBottom: "10px"}}>AI 답변</h2>
                <div
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
