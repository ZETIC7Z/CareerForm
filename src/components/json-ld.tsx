/**
 * Renders structured data as a plain `<script type="application/ld+json">`.
 *
 * A native tag (not `next/script`) is the right call here: JSON-LD is data, not
 * executable code, so it must be in the server-rendered HTML for crawlers to see it
 * without running JavaScript. The `\u003c` escape is the shield against a `</script>`
 * smuggled into any string that ends up in this payload.
 */
export default function JsonLd({data}:{data:unknown}){
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,'\\u003c')}}
    />
  );
}
