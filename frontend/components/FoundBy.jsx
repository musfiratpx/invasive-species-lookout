/**
 * Small line under a text section: which search found it (Snowflake Cortex Search,
 * or the offline keyword search), in which of our fact sheets, and whether it is
 * shown word for word. Makes the RAG step visible and honest.
 */

const SEARCH_NAMES = {
  snowflake: "Snowflake Cortex Search",
  keyword: "keyword search (offline backup)",
};

export default function FoundBy({ where }) {
  if (!where) return null;
  const files = where.files.map((f) => f.replace(/\.md$/, "")).join(" + ");
  return (
    <p className="found-by">
      🔎 Found by {SEARCH_NAMES[where.retriever] || where.retriever} in our fact sheet <code>{files}</code> › {where.section}
      {where.word_for_word ? " · shown word for word" : " · reworded by AI from this text only"}
    </p>
  );
}
