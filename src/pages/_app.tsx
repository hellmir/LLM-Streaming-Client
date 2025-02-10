import "@/styles/globals.css";
import 'github-markdown-css/github-markdown.css';
import type {AppProps} from "next/app";
import Head from "next/head";

export default function App({Component, pageProps}: AppProps) {
    return (
        <>
            <Head>
                <title>생성형 AI 스트리밍 서비스</title>
                <link rel="icon" href="/ai.png" type="image/png"/>
            </Head>
            <Component {...pageProps} />
        </>
    );
}
