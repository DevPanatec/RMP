const { execSync } = require('child_process');
const fs = require('fs');

// La clave PKCS#8 correcta
const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDzWVyjx8+odZx3
AJzQJ50z3a2NDJvmcroOEgkcWbJWwMWXHW8JTPIN9K2Eipdt/m41iEXjYLAbVlng
KcI9oMHG969OyGDt13rEJtxVzF5L4Rej3HSXbumFm3dpsV0q+/JzV3fUMbWYnehV
KjBDnK7rvrwSQobtLLMrJHIoUUul/u0sNWR5YOz0vCq966EbUSwzQwwCPMk/+EBp
2Zp8CphQqCbeZPjhMlyZ2fNsAQ/HrXCngl5SPp38aXATlrMIqpfxSKF9iSt+eGFg
nOw4qpc3A40vb9xsfVGiyVTfXl4yIxh6ygajomqPHQym3kzxmVo1+bM9hVzmJYzU
ERXFRb+FAgMBAAECggEAAgtJnmySv3kBb/R23L7AcMuXZhxpgNWM34piPjU4rMbg
wgSyxpK5Y8me3YKmg/uDpHp5D9Bjmk8u4RWotojPp+Kzu8cuHUFWnCgxaJ0XW67P
2oYDCrSZTJCCP8aIIFDOeA6PiJ5ERrxo07JPhnnd9Ef9X2/kn0BlXuLm/JS2PHY0
CTgOeR63ad6R9EA3A7O3UDcHhMsIbaxaaNzXLUpIVxp19nUGIaTackUWdUWu/cZi
HwD0N7LbxymYOV4wfhY/tIDypDCPgicSS9FWprNa7Yx3tQ/9yS6esG/q3XXivsMp
aLdLuJz2ScYEWO6bIyaL5WhzkykO8OSm00ARfAYtkQKBgQD9q3ryWrmA0J/pbx82
kWFz8jZW0Q/JXhyfrIu9tUprTKz/4wD9B7tjAnh1CuIrQCZAlIEy5uLrjLEZjoST
ef0Y4xOFqed44Clzacyx/fk/th19Vt99liVtF3/zSeOOqO5agGaI3ohQyyY/2bt3
l3D2jwRkPW2nu39hxDXbu4KLLQKBgQD1lZyYK5YzXgOwxCPzh4EI+BzgDr1J9X2n
Jkj2D1CB79g+gRfo8AagtoWo/rNZCgcesCaAcv7vHQDviF3Bfg6NWqJS3ndJp5Ji
CoO+gzwYEkUKt3ROewIne20MTq2i0vTz+oahYyCoMCyv/jf1yPt98pjGdiYTlzDg
71qJSHdcuQKBgGp6MUhLZrQ4XfdJKovoKETX9ZEpffvjYhZwAdQmpc82RyO9sGuF
dFWR8ugGIntPGP9gln68RaHj027L0MBqox9wKYCgmcW2KhAE5+QKnDXvBp/W+Eap
4JnTFGUVrcvzAuHAJcnrxsJLE4oXpcYELmmADLLayg1u+YAbMRRDt/8dAoGBAIkF
vueQei+S5xA7f6ujETXF6aaB0s9vL3qRe+f+R3cYMVk+ge6v7aLB8/WEluC5HZvb
wL+uadtUHW+IcHdDNC9eQG9oPLpVyvD02Oj1JBRyLR97mGMpctxAm2lghLTya0Wt
pGxreI8ewfA4MVTrnJZ7Qw6IYVpQ4y69nZA3ZJHRAoGANX6r2UdjHzqA8RoyFcYZ
3kSOruF0Sa0u0N+Hd25C6lcFf/7acs/IOpfNZZfEn3nb5OHDPoJQfKdDnKg+MkCZ
k0tPFTM+oCGEoq8zzSMAFDE2f9az0+qq1ZWCfZyU9AVTIQAbHihWXastZ39plhoX
PGIEU7qFzgKayKYo0/0cGPg=
-----END PRIVATE KEY-----`;

// Guardar en archivo temporal
fs.writeFileSync('.jwt_private_key_temp', privateKey);

console.log('🔑 Configurando JWT_PRIVATE_KEY en Convex...');

try {
  // Usar el archivo temporal para configurar la variable
  const result = execSync('npx convex env set JWT_PRIVATE_KEY @.jwt_private_key_temp', {
    encoding: 'utf8',
    stdio: 'pipe'
  });

  console.log('✅ JWT_PRIVATE_KEY configurado correctamente');
  console.log(result);

  // Eliminar archivo temporal
  fs.unlinkSync('.jwt_private_key_temp');

  console.log('\n🔄 Ahora reinicia Convex Dev:');
  console.log('   1. Presiona Ctrl+C para detener el proceso actual');
  console.log('   2. Ejecuta: npx convex dev');
  console.log('   3. Intenta crear los usuarios de nuevo en http://localhost:8000/?seed');

} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n📝 Copia y pega esta clave manualmente en el dashboard de Convex:');
  console.log(privateKey);
}
