// netlify/functions/get-drive-file-content.js

exports.handler = async function (event, context) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const fileId = event.queryStringParameters.fileId;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: 'La clave de API de Google no está configurada en el servidor.',
    };
  }

  if (!fileId) {
    return {
      statusCode: 400,
      body: 'No se proporcionó el ID del archivo.',
    };
  }

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.text();

    return {
      statusCode: response.status,
      body: data,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: 'Error al contactar la API de Google Drive para obtener el contenido del archivo.',
    };
  }
};