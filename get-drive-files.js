// netlify/functions/get-drive-files.js

exports.handler = async function (event, context) {
  // Obtenemos la clave de API desde las variables de entorno seguras de Netlify.
  const apiKey = process.env.GOOGLE_API_KEY;
  
  // Obtenemos el ID de la carpeta desde los parámetros de la URL.
  const folderId = event.queryStringParameters.folderId;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { message: 'La clave de API de Google no está configurada en el servidor.' } }),
    };
  }

  if (!folderId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: { message: 'No se proporcionó el ID de la carpeta.' } }),
    };
  }

  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&key=${apiKey}&pageSize=100&fields=files(id,name,mimeType,webViewLink,thumbnailLink,owners)&supportsAllDrives=true&includeItemsFromAllDrives=true`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    return {
      statusCode: response.status, // Reenviamos el código de estado de Google
      body: JSON.stringify(data),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { message: 'Error al contactar la API de Google Drive.' } }),
    };
  }
};