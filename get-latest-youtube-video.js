// netlify/functions/get-latest-youtube-video.js

exports.handler = async function (event, context) {
  // Obtiene la clave de API de YouTube desde las variables de entorno de Netlify.
  const apiKey = process.env.GOOGLE_API_KEY; // Usamos la misma variable que las otras funciones.
  const channelId = event.queryStringParameters.channelId;
  const maxResults = event.queryStringParameters.maxResults || 3; // Acepta un parámetro o usa 3 por defecto.

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { message: 'La clave de API de Google no está configurada en el servidor.' } }),
    };
  }

  if (!channelId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: { message: 'No se proporcionó el ID del canal de YouTube.' } }),
    };
  }

  // URL de la API de YouTube para buscar el último video de un canal.
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=${maxResults}&type=video&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify(data) };
    }

    // Si se encuentran videos, devuelve el ID del primero (el más reciente).
    if (data.items && data.items.length > 0) { 
      const videos = data.items.map(item => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
      }));
      return { statusCode: 200, body: JSON.stringify({ videos }) };
    }

    return { statusCode: 404, body: JSON.stringify({ error: { message: 'No se encontraron videos en el canal.' } }) };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Error al contactar la API de YouTube.' } }) };
  }
};