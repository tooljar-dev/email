// Wrangler bundles .txt files as plain strings (its default "Text" module rule).
declare module "*.txt" {
  const text: string;
  export default text;
}
