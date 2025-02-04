import { join } from 'path'
import { createBot, createProvider, createFlow, addKeyword, utils, EVENTS} from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'

import { promises as fs } from 'fs';

const PORT = process.env.PORT ?? 3008

const discordFlow = addKeyword('doc').addAnswer(
    ['You can see the documentation here', '📄 https://builderbot.app/docs \n', 'Do you want to continue? *yes*'].join(
        '\n'
    ),
    { capture: true },
    async (ctx, { gotoFlow, flowDynamic }) => {
        if (ctx.body.toLocaleLowerCase().includes('yes')) {
            return gotoFlow(registerFlow)
        }
        await flowDynamic('Thanks!')
        return
    }
)


const welcomeFlow = addKeyword(['hi', 'hello', 'hola'])
    .addAnswer(`🙌 HelloCarga la imagen *Chatbot*`)
    .addAnswer(
        [
            'I share with you the following links of interest about the project',
            '👉 *doc* to view the documentation',
        ].join('\n'),
        { delay: 800, capture: true },
        async (ctx, { fallBack }) => {
            if (!ctx.body.toLocaleLowerCase().includes('doc')) {
                return fallBack('You should type *doc*')
            }
            return
        },
        [discordFlow]
    )

    const saveFile = addKeyword(EVENTS.MEDIA)
    .addAction(async (ctx, { provider, flowDynamic }) => {
        const filePath = await provider.saveFile(ctx, { path: './filesystem/' })
        await flowDynamic([{ body: `Archivo guardado correctamente en: ${filePath}`, delay: 600 }]);
    })


    const registerFlow = addKeyword('register')
    // Paso 1: Solicitar el nombre
    .addAnswer('¿Cuál es tu nombre?', { capture: true }, async (ctx, { state }) => {
        await state.update({ name: ctx.body });
    })
    // Paso 2: Solicitar el apellido
    .addAnswer('¿Cuál es tu apellido?', { capture: true }, async (ctx, { state }) => {
        await state.update({ surname: ctx.body });
    })
    .addAnswer('¿Cuál es tu numero de documento?', { capture: true }, async (ctx, { state }) => {
        await state.update({ doc: ctx.body });
    })
    // Paso 3: Solicitar la carga de imagen y esperar EVENT.MEDIA
    .addAnswer('Gracias. Ahora, por favor carga una imagen o un video.', { capture: true }, async (_, { flowDynamic }) => {
        await flowDynamic([{ body: 'Esperando que envíes un archivo multimedia...' }]);
    })
    .addAction(async (ctx, { provider, state, flowDynamic }) => {
        try {
            if (!ctx.message.imageMessage || !ctx.message.imageMessage.url) {
                throw new Error('El archivo enviado no es válido.');
            }

            const doc = state.get('doc');
            const fileExtension = ctx.message.imageMessage.mimetype.split('/')[1];
            const directory = `./filesystem/${doc}`;
            const fileName = `doc_${doc}.${fileExtension}`;
            const fullPath = `${directory}/${fileName}`;

            // Verificar si el archivo ya existe
            try {
                await fs.access(fullPath);  // Verificar si el archivo ya existe
                await flowDynamic([{ body: 'Este archivo ya ha sido enviado anteriormente.' }]);
                return;  // Detener el proceso si el archivo ya existe
            } catch (error) {
                // El archivo no existe, continuar con el guardado
            }

            // Verificar si el directorio existe
            try {
                await fs.access(directory);
            } catch (error) {
                // Si no existe, crear el directorio
                await fs.mkdir(directory, { recursive: true });
            }

            // Guardar archivo en un directorio temporal
            const tempPath = await provider.saveFile(ctx, { path: directory });

            // Renombrar el archivo guardado
            await fs.rename(tempPath, fullPath);

            // Actualizar el estado con la ruta final
            await state.update({ filePath: fullPath });

            await flowDynamic([{ body: `¡Archivo recibido y guardado como ${fileName}!` }]);
        } catch (error) {
            console.error('Error al guardar el archivo:', error);
            await flowDynamic([{ body: 'Hubo un error al procesar el archivo. Por favor, inténtalo de nuevo.' }]);
        }
    })
    // Paso 4: Confirmar los datos recibidos y mostrar información al usuario
    .addAction(async (_, { flowDynamic, state }) => {
        const name = state.get('name');
        const surname = state.get('surname');
        const doc = state.get('doc');
        const filePath = state.get('filePath');
        await flowDynamic([
            { body: `¡Registro completo! Nombre: *${name} ${surname}*.\n Documento: ${doc}\n  Archivo cargado: ${filePath}` }
        ]);
    });






// Flujo de registro
const registerFlow2 = addKeyword(utils.setEvent('REGISTER_FLOW'))
    // Paso 1: Preguntar el nombre
    .addAnswer('¿Cuál es tu nombre?', { capture: true }, async (ctx, { state }) => {
        if (!ctx.body.trim()) {
            return 'Por favor, proporciona un nombre válido.';
        }
        await state.update({ name: ctx.body });
    })
    // Paso 2: Preguntar la edad
    .addAnswer('¿Cuál es tu edad?', { capture: true }, async (ctx, { state }) => {
        const age = parseInt(ctx.body, 10);
        if (isNaN(age) || age <= 0) {
            return 'Por favor, proporciona una edad válida.';
        }
        await state.update({ age });
    })
    // Paso 3: Redirigir al flujo saveFile
    .addAnswer('Ahora, por favor carga tu documento (imagen o archivo).', async (_, { gotoFlow }) => {
        await gotoFlow(saveFile); // Redirige al flujo saveFile
    })
    // Paso 4: Finalizar el flujo
    .addAction(async (_, { flowDynamic, state }) => {
        const name = state.get('name');
        const age = state.get('age');
        await flowDynamic([
            { body: `${name}, gracias por completar tu registro.`, delay: 500 },
            { body: `Hemos registrado tu edad como: ${age} años. ¡Buen día!`, delay: 1000 },
        ]);
    });

   

const fullSamplesFlow = addKeyword(['samples', utils.setEvent('SAMPLES')])
    .addAnswer(`💪 I'll send you a lot files...`)
    .addAnswer(`Send image from Local`, { media: join(process.cwd(), 'assets', 'sample.png') })
    .addAnswer(`Send video from URL`, {
        media: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTJ0ZGdjd2syeXAwMjQ4aWdkcW04OWlqcXI3Ynh1ODkwZ25zZWZ1dCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LCohAb657pSdHv0Q5h/giphy.mp4',
    })
    .addAnswer(`Send audio from URL`, { media: 'https://cdn.freesound.org/previews/728/728142_11861866-lq.mp3' })
    .addAnswer(`Send file from URL`, {
        media: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    })

const main = async () => {
    const adapterFlow = createFlow([welcomeFlow, registerFlow,saveFile,fullSamplesFlow])
    //const adapterFlow = createFlow([saveFile])
    const adapterProvider = createProvider(Provider)
    const adapterDB = new Database()

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    adapterProvider.server.post(
        '/v1/messages',
        handleCtx(async (bot, req, res) => {
            const { number, message, urlMedia } = req.body
            await bot.sendMessage(number, message, { media: urlMedia ?? null })
            return res.end('sended')
        })
    )

    adapterProvider.server.post(
        '/v1/register',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('REGISTER_FLOW', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/samples',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('SAMPLES', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/blacklist',
        handleCtx(async (bot, req, res) => {
            const { number, intent } = req.body
            if (intent === 'remove') bot.blacklist.remove(number)
            if (intent === 'add') bot.blacklist.add(number)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', number, intent }))
        })
    )

    httpServer(+PORT)
}

main()
