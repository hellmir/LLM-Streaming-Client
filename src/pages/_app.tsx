import "@/styles/globals.css";
import 'github-markdown-css/github-markdown.css';
import type {AppProps} from "next/app";

export default function App({Component, pageProps}: AppProps) {
    return <Component {...pageProps} />;
}
