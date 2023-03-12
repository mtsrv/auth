export const response = (body = {}, opts = {}) => {
  return new Response(JSON.stringify(body), {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,OPTIONS,DELETE',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    },
    status: 200,
    ...opts
  })
}
