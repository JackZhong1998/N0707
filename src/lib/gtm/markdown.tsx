/**
 * 轻量 Markdown 渲染（无第三方依赖）。
 * 支持：标题、粗体/斜体/行内代码、无序/有序列表、表格、引用、分隔线、段落。
 */

import React from 'react';

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // 粗体 / 斜体 / 行内代码
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith('**')) {
      nodes.push(<strong key={`${keyPrefix}-b${i}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      nodes.push(<code key={`${keyPrefix}-c${i}`}>{token.slice(1, -1)}</code>);
    } else {
      nodes.push(<em key={`${keyPrefix}-i${i}`}>{token.slice(1, -1)}</em>);
    }
    last = m.index + token.length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = (text ?? '').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i++;
      continue;
    }

    // 分隔线
    if (/^\s*---+\s*$/.test(line)) {
      blocks.push(<hr key={key++} />);
      i++;
      continue;
    }

    // 标题
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const content = renderInline(heading[2], `h${key}`);
      if (level === 1) blocks.push(<h1 key={key++}>{content}</h1>);
      else if (level === 2) blocks.push(<h2 key={key++}>{content}</h2>);
      else if (level === 3) blocks.push(<h3 key={key++}>{content}</h3>);
      else blocks.push(<h4 key={key++}>{content}</h4>);
      i++;
      continue;
    }

    // 表格
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const headerCells = line.split('|').map((c) => c.trim()).filter(Boolean);
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && lines[j].includes('|')) {
        rows.push(lines[j].split('|').map((c) => c.trim()).filter(Boolean));
        j++;
      }
      blocks.push(
        <table key={key++}>
          <thead>
            <tr>
              {headerCells.map((c, ci) => (
                <th key={ci}>{renderInline(c, `th${key}-${ci}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((c, ci) => (
                  <td key={ci}>{renderInline(c, `td${key}-${ri}-${ci}`)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
      i = j;
      continue;
    }

    // 引用
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(
        <blockquote key={key++}>{renderInline(quoteLines.join(' '), `q${key}`)}</blockquote>
      );
      continue;
    }

    // 列表
    const ulMatch = /^\s*[-*•]\s+/.test(line);
    const olMatch = /^\s*\d+[.)]\s+/.test(line);
    if (ulMatch || olMatch) {
      const items: string[] = [];
      const isOl = olMatch;
      while (
        i < lines.length &&
        (isOl ? /^\s*\d+[.)]\s+/.test(lines[i]) : /^\s*[-*•]\s+/.test(lines[i]))
      ) {
        items.push(lines[i].replace(isOl ? /^\s*\d+[.)]\s+/ : /^\s*[-*•]\s+/, ''));
        i++;
      }
      const children = items.map((item, ii) => (
        <li key={ii}>{renderInline(item, `li${key}-${ii}`)}</li>
      ));
      blocks.push(isOl ? <ol key={key++}>{children}</ol> : <ul key={key++}>{children}</ul>);
      continue;
    }

    // 段落（合并连续行）
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,4})\s/.test(lines[i]) &&
      !/^\s*[-*•]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !lines[i].startsWith('>') &&
      !/^\s*---+\s*$/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(<p key={key++}>{renderInline(paraLines.join(' '), `p${key}`)}</p>);
  }

  return <div className={className ?? 'doc-prose'}>{blocks}</div>;
}
