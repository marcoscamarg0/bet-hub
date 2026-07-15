async function testTwitch() {
  const query = `
    query {
      user(login: "saullo") {
        stream {
          id
          title
          type
        }
      }
    }
  `;
  const res = await fetch("https://gql.twitch.tv/gql", {
    method: "POST",
    headers: { "Client-ID": "kimne78kx3ncx6brgo4mv6wki5h1ko" },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
testTwitch();
