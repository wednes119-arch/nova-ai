import { useState } from "react";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

import "../styles/codeblock.css";

export default function CodeBlock({
  language,
  code,
}) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <div className="code-block">

      <div className="code-header">

        <span>{language}</span>

        <button
          onClick={copyCode}
          className="copy-btn"
        >
          {copied ? "✅ Copied" : "📋 Copy"}
        </button>

      </div>

      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: 0,
        }}
      >
        {code}
      </SyntaxHighlighter>

    </div>
  );
}