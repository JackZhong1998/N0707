(function exposeXTextTools(global) {
  const URL_PATTERN = /https?:\/\/[^\s]+/iy;
  const NATURAL_BREAK = /[\s,.!?;:，。！？；：、]/u;

  function codePointWeight(character) {
    const point = character.codePointAt(0) || 0;
    const isSingleWeight =
      point <= 0x10ff ||
      (point >= 0x2000 && point <= 0x200d) ||
      (point >= 0x2010 && point <= 0x201f) ||
      (point >= 0x2032 && point <= 0x2037);
    return isSingleWeight ? 1 : 2;
  }

  function unitsFor(text) {
    const source = String(text || '').replace(/\r\n?/g, '\n');
    const units = [];
    let index = 0;
    while (index < source.length) {
      URL_PATTERN.lastIndex = index;
      const urlMatch = URL_PATTERN.exec(source);
      if (urlMatch && urlMatch.index === index) {
        units.push({ text: urlMatch[0], weight: 23, naturalBreak: false });
        index += urlMatch[0].length;
        continue;
      }
      const point = source.codePointAt(index);
      const character = String.fromCodePoint(point);
      units.push({
        text: character,
        weight: codePointWeight(character),
        naturalBreak: NATURAL_BREAK.test(character),
      });
      index += character.length;
    }
    return units;
  }

  function weightedLength(text) {
    return unitsFor(text).reduce((total, unit) => total + unit.weight, 0);
  }

  function hardSplit(text, maxWeight = 280) {
    const units = unitsFor(text);
    const chunks = [];
    let start = 0;

    while (start < units.length) {
      while (start < units.length && /^\s$/u.test(units[start].text)) start += 1;
      if (start >= units.length) break;

      let end = start;
      let weight = 0;
      let preferredBreak = -1;
      while (end < units.length) {
        const nextWeight = weight + units[end].weight;
        if (nextWeight > maxWeight) break;
        weight = nextWeight;
        end += 1;
        if (units[end - 1].naturalBreak && weight >= maxWeight * 0.45) {
          preferredBreak = end;
        }
      }

      if (end === units.length) {
        const tail = units.slice(start).map((unit) => unit.text).join('').trim();
        if (tail) chunks.push(tail);
        break;
      }

      const cut = preferredBreak > start ? preferredBreak : Math.max(start + 1, end);
      const chunk = units.slice(start, cut).map((unit) => unit.text).join('').trim();
      if (chunk) chunks.push(chunk);
      start = cut;
    }

    return chunks;
  }

  function sentenceSegments(text) {
    const source = String(text || '').replace(/\r\n?/g, '\n').trim();
    if (!source) return [];
    const paragraphs = source.split(/\n\s*\n+/u).map((part) => part.trim()).filter(Boolean);
    const sentenceSegmenter =
      typeof Intl !== 'undefined' && Intl.Segmenter
        ? new Intl.Segmenter(undefined, { granularity: 'sentence' })
        : null;
    const segments = [];

    paragraphs.forEach((paragraph, paragraphIndex) => {
      const normalizedParagraph = paragraph.replace(/\s*\n\s*/gu, ' ').trim();
      const sentences = sentenceSegmenter
        ? [...sentenceSegmenter.segment(normalizedParagraph)]
            .map((item) => item.segment.trim())
            .filter(Boolean)
        : normalizedParagraph.match(/[^.!?。！？]+(?:[.!?。！？]+["'”’）)]*|$)/gu) || [normalizedParagraph];
      sentences.forEach((sentence, sentenceIndex) => {
        segments.push({
          text: sentence.trim(),
          paragraphStart: paragraphIndex > 0 && sentenceIndex === 0,
        });
      });
    });

    return segments;
  }

  function splitThread(text, maxWeight = 280) {
    const segments = sentenceSegments(text);
    const chunks = [];
    let current = '';

    for (const segment of segments) {
      const separator = current ? (segment.paragraphStart ? '\n\n' : ' ') : '';
      const candidate = `${current}${separator}${segment.text}`;
      if (weightedLength(candidate) <= maxWeight) {
        current = candidate;
        continue;
      }

      if (current) {
        chunks.push(current.trim());
        current = '';
      }

      if (weightedLength(segment.text) <= maxWeight) {
        current = segment.text;
        continue;
      }

      const forcedParts = hardSplit(segment.text, maxWeight);
      chunks.push(...forcedParts.slice(0, -1));
      current = forcedParts.at(-1) || '';
    }

    if (current.trim()) chunks.push(current.trim());
    return chunks;
  }

  function splitThreadContent(text, hashtags, maxWeight = 280) {
    const chunks = splitThread(text, maxWeight);
    const tagText = String(hashtags || '').trim();
    if (!tagText) return chunks;
    if (chunks.length === 0) return splitThread(tagText, maxWeight);

    const lastIndex = chunks.length - 1;
    const withTags = `${chunks[lastIndex]}\n\n${tagText}`;
    if (weightedLength(withTags) <= maxWeight) {
      chunks[lastIndex] = withTags;
      return chunks;
    }

    return [...chunks, ...splitThread(tagText, maxWeight)];
  }

  global.NowBuildXText = {
    weightedLength,
    splitThread,
    splitThreadContent,
  };
})(globalThis);
