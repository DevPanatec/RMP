/**
 * Cloudflare Worker - GPS Proxy para RMP
 *
 * Proxy entre el GPS tracker y Convex. Solo redirige el path
 * `/safetag/webhook` para evitar abuso del proxy.
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Restringir el proxy ÚNICAMENTE al endpoint de webhook de SafeTag.
  if (!request.url.includes('/safetag/webhook')) {
    return new Response('Not Found', { status: 404 })
  }

  // URL de destino de Convex
  const CONVEX_URL = 'https://youthful-warbler-749.convex.site'

  // Obtener la URL completa de la petición
  const url = new URL(request.url)

  // Construir la URL de destino manteniendo el path
  const targetUrl = CONVEX_URL + url.pathname + url.search

  console.log(`📡 GPS Proxy: ${request.method} ${url.pathname} -> ${targetUrl}`)

  // Crear nueva petición con los mismos datos pero a Convex
  const newRequest = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  })

  try {
    // Reenviar la petición a Convex
    const response = await fetch(newRequest)

    // Clonar la respuesta para poder leerla
    const clonedResponse = response.clone()
    const responseText = await clonedResponse.text()

    console.log(`✅ Respuesta de Convex: ${response.status} - ${responseText}`)

    // Devolver la respuesta original al GPS
    return response

  } catch (error) {
    console.error(`❌ Error en proxy: ${error.message}`)

    return new Response(JSON.stringify({
      error: 'Proxy error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
