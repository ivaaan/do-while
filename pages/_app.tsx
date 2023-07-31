import { AppProps } from "next/app";
import Head from "next/head";
import "../styles/globals.css";

function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Ivan, Full-Stack Developer</title>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, user-scalable=no" />
        <link href="/icon.png" rel="icon" sizes="any" type="image/png" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
export default App;
