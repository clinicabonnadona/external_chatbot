import { createBot, createProvider, createFlow, addKeyword, EVENTS} from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
//import { idleFlow, reset, start, stop, } from "./idle-custom"
import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';

const PORT = process.env.PORT ?? 3008

dotenv.config();

const ipService = process.env.IP;
const token = process.env.TOKEN;
const cli = process.env.ClI;
const timeAct = process.env.TIME;

const getFlujoGet = async (apiUrl) => {
  try {
    const url = ipService+apiUrl
    const response = await axios.get(url);
    return response
  } catch (error) {
    // Manejo de errores
    console.error('Error al realizar la solicitud:', error.message);
  }
};

const getFlujoPost = async (apiUrl,datosPost) => {
  try {
    const url = ipService+apiUrl
    const response = await axios.post(url,datosPost);
    return response
  } catch (error) {
    // Manejo de errores
    console.error('Error al realizar la solicitud:', error.message);
  }
};

var listaTipoDoc = [];
var contratos = [];
var especialidades = [];
var cups = [];
var doctors = [];
var disponibilidad = [];
var dataUserCan = [];
var mensajes = [];
var listaContrato = [];
var listoDeptos = [];
var listoMun = [];
var listaPreguntas = [];

const flowPrincipal = addKeyword(EVENTS.WELCOME)
//.addAction(async (ctx, { gotoFlow }) => start(ctx, gotoFlow, timeAct))
.addAnswer([
    '**¡Hola! Bienvenid@ a la Central de Citas de la Clínica Bonnadona.**\n\n' +
    'Soy *Charlie* 🤖, tu asistente virtual. Estoy aquí para ayudarte a programar tus citas de forma rápida y sencilla. 😊\n\n' +
    'Antes de continuar, es importante que aceptes nuestros *Términos y Condiciones*, así como las **Políticas de Privacidad y Tratamiento de Datos**. Puedes consultarlas en el siguiente enlace:\n' +
    '👉 [Términos y Condiciones](https://acortar.link/P5VQf5)\n\n' +
    'Por favor, selecciona una opción:\n' +
    '*1.* Acepto\n' +
    '*2.* No acepto'
], 
{ capture: true }, 
async (ctx, { fallBack, endFlow, gotoFlow }) => {
    // Obtener los mensajes dinámicos del servidor
    const responseData = await getFlujoGet('getmessage');
    mensajes = responseData.data;
    // Validar la respuesta del usuario
    if (!['1', '2'].includes(ctx.body)) {
        return fallBack('Por favor escribe una opción válida.');
    }

    // Manejar la respuesta "No acepto"
    if (ctx.body === '2') {
      //  stop(ctx); // Detener la sesión o proceso en curso
        return endFlow('Gracias por utilizar nuestro canal de WhatsApp. ¡Te esperamos para una próxima ocasión!');
    }
})
.addAction(async (ctx, { flowDynamic,gotoFlow}) => {
  //resetInactividad(ctx, gotoFlow, timeAct);
  //reset(ctx, gotoFlow, timeAct);
  const responseData = await getFlujoGet('getipodocs')
  listaTipoDoc = responseData.data;
  const lista = responseData.data.map(item => ({
    tp_id: item.tp_id,
    tp_name: item.tp_name,
    tp_detail: item.tp_detail
  }));

  const listaTexto = lista.map((objeto, index) =>`*${index+1}.* ${objeto.tp_name} (${objeto.tp_detail})`).join('\n');
  await flowDynamic(`${mensajes[1].ms_mensaje}:\n\n${listaTexto} \n \n escribe *volver* para la pregunta anterior \n escribe *Salir* para la pregunta anterior `)
  
})
.addAction({ capture: true }, async (ctx, { flowDynamic,state,fallBack,gotoFlow}) => {
 // resetInactividad(ctx, gotoFlow, timeAct);
  if (ctx.body == 'volver') {
    return gotoFlow(flowPrincipal, 1)
  }else{
    const userInput = ctx.body.toLowerCase();
    
    if (ctx.body > 0 && ctx.body <= listaTipoDoc.length ) {
      const objtipoDoc = listaTipoDoc[ctx.body-1].tp_name;
      await state.update({tipo: objtipoDoc});
      await flowDynamic(`${mensajes[2].ms_mensaje}`)
        
      } else if (userInput == 'salir'){
  
      } else {
        return fallBack('Por favor escribir una opción valida')
      }
  } 

})
.addAction({ capture: true }, async (ctx, { gotoFlow, state }) => {
    await state.update({documento: ctx.body});
  //  resetInactividad(ctx, gotoFlow, timeAct);
})
.addAction(null, async (ctx, { flowDynamic, state,gotoFlow }) => {
  const myState = state.getMyState()
  const postData = { 
    tipodoc : myState.tipo,
    documento : myState.documento,
    id : cli,
    token :token
   } 

  const responseData = await getFlujoPost('consultausuario',postData)
  let nameUser = responseData.data;

  // Validar si el objeto contiene la palabra "error"
if (nameUser && nameUser.error) {
  await flowDynamic(nameUser.error)
  return  gotoFlow(flujoUsuariosNORegistrados)
} else {
  await state.update({nombre: nameUser.paciente[0].nombre_paciente});
  return  gotoFlow(flujoUsuariosRegistrados)
}

})

const flujoUsuariosRegistrados = addKeyword('#_USUARIOS_REGISTRADOS_#')
.addAction(async(ctx, {flowDynamic,state,gotoFlow}) => {
  const myState = state.getMyState()
  await flowDynamic(`👋🏻 Hola ${myState.nombre}, Que deseas hacer :\n  \n 1️⃣ Agendar Cita \n 2️⃣ Cancelar Cita \n 3️⃣ Consultar Citas \n 4️⃣ Preguntas Frecuentes \n\nSi desea salir del chat por favor escribir  *Salir* `)
  // resetInactividad(ctx, gotoFlow, timeAct);
})
.addAction({capture:true},
    async(ctx, {fallBack,endFlow,state,gotoFlow}) => {
      
       if (ctx.body == 'salir') {
        //stopInactividad(ctx); 
        return endFlow('Gracias por utilizar nuestro canal de WhatsApp. ¡Te esperamos para una próxima!')
      
      }else if ( !['1','2','3','4'].includes(ctx.body)) { 
        return fallBack('Por favor escribir una opción valida')
      
      } else {
 
        let action = '';
        switch (ctx.body) {
          case "1":
              action = 'agenda'
              return gotoFlow(flowAgenda);
          break;
          case "2":
            action = 'cancela'
              return gotoFlow(flowCancelar);
          break;
          case "3":
              action = 'consulta'
              return gotoFlow(flowConsulta);
          break;
          case "4":
              action = 'consulta'
              return gotoFlow(flowPreguntas);
          break;
        }
        await state.update({action: action});
      }

})

const flowAgenda = addKeyword('#_AGENDAR_CITA_MEDICA#')
  .addAction(async (ctx, { flowDynamic, state, gotoFlow }) => {
    try {
      const myState = state.getMyState();
      const postData = {
        tipodoc: myState.tipo,
        documento: myState.documento,
        id: cli,
        token: token,
      };

      const responseData = await getFlujoPost('consultausuario', postData);
      contratos = responseData.data.contratos || [];

      if (!contratos.length) {
        await flowDynamic('No se encontraron contratos asociados. Por favor intenta más tarde.');
        return gotoFlow(flujoUsuariosRegistrados);
      }

      const listaTexto = contratos
        .map((item, index) => `*${index + 1}.* ${item.contrato}`)
        .join('\n');

      await flowDynamic(`${mensajes[3].ms_mensaje}: \n\n${listaTexto}`);
    } catch (error) {
      console.error('Error al consultar contratos:', error);
      await flowDynamic('Hubo un error al procesar tu solicitud. Por favor, intenta de nuevo más tarde.');
    }
  })
  .addAction({ capture: true }, async (ctx, { flowDynamic, state, fallBack, gotoFlow }) => {
    try {
      const seleccion = parseInt(ctx.body, 10);
      if (isNaN(seleccion) || seleccion < 1 || seleccion > contratos.length) {
        return fallBack('Por favor selecciona una opción válida.');
      }

      const codcontrato = contratos[seleccion - 1];
      await state.update({ contrato: codcontrato });

      const myState = state.getMyState();
      const postData = {
        tipodoc: myState.tipo,
        documento: myState.documento,
        id: cli,
        token: token,
      };

      const responseData = await getFlujoPost('consultaresp', postData);
      especialidades = responseData.data || [];

      if (!especialidades.length) {
        await flowDynamic('No se encontraron especialidades disponibles.');
        return gotoFlow(flujoUsuariosRegistrados);
      }

      const listaTexto = especialidades
        .map((item, index) => `*${index + 1}.* ${item.especialidad}`)
        .join('\n');

      await flowDynamic(`${mensajes[4].ms_mensaje}: \n\n${listaTexto}`);
    } catch (error) {
      console.error('Error al consultar especialidades:', error);
      await flowDynamic('Hubo un error al procesar tu solicitud. Por favor, intenta de nuevo más tarde.');
    }
  })
  .addAction({ capture: true }, async (ctx, { flowDynamic, state, fallBack }) => {
    try {
      const seleccion = parseInt(ctx.body, 10);
      if (isNaN(seleccion) || seleccion < 1 || seleccion > especialidades.length) {
        return fallBack('Por favor selecciona una opción válida.');
      }

      const codesp = especialidades[seleccion - 1];
      await state.update({ esp: codesp });

      const myState = state.getMyState();
      const postData = {
        esp: codesp.CitEspMed,
        id: cli,
        token: token,
      };

      const responseData = await getFlujoPost('consultarcup', postData);
      const cups = responseData.data || [];

      if (!cups.length) {
        await flowDynamic('No hay datos disponibles.');
        return gotoFlow(flujoUsuariosRegistrados);
      }

      await state.update({ cups });
      const listaTexto = cups
        .map((item, index) => `*${index + 1}.* ${item.detalle}`)
        .join('\n');
      await flowDynamic(`Opciones disponibles:\n\n${listaTexto}\n\nPor favor selecciona una opción.`);
    } catch (error) {
      console.error('Error al consultar CUPs:', error);
      await flowDynamic('Hubo un error al procesar tu solicitud. Por favor, intenta de nuevo más tarde.');
    }
  })
  .addAction({ capture: true }, async (ctx, { flowDynamic, state, fallBack }) => {
    try {
      const seleccionCups = parseInt(ctx.body, 10);
      const myState = state.getMyState();
      const cups = myState.cups || [];

      if (isNaN(seleccionCups) || seleccionCups < 1 || seleccionCups > cups.length) {
        return fallBack('Por favor selecciona una opción válida.');
      }

      const cupsf = cups[seleccionCups - 1];
      await state.update({ cupsf });

      const doctorOpciones = [{
        doctors: myState.esp.CitEspMed,
        doctors_det: myState.esp.medico,
      }];
      const listaTexto = doctorOpciones
        .map((item, index) => `*${index + 1}.* ${item.doctors_det}`)
        .join('\n');

      await flowDynamic(`Opciones de doctores:\n\n${listaTexto}\n\nPor favor selecciona una opción.`);
    } catch (error) {
      console.error('Error al seleccionar CUPs:', error);
      await flowDynamic('Hubo un error al procesar tu solicitud. Por favor, intenta de nuevo más tarde.');
    }
  })
  .addAction({ capture: true }, async (ctx, { flowDynamic, state, fallBack, endFlow, gotoFlow }) => {
    const myState = state.getMyState();
  
    // Opción inicial: Cómo desea proceder
    if (ctx.body == '1') {
      await state.update({ doctor: myState.esp });
      return flowDynamic('¿Cómo desea buscar disponibilidad para su cita?\n\n1️⃣ Fecha más cercana\n2️⃣ Fecha específica');
    } else if (ctx.body == '2') {
      return endFlow('Comuníquese con el Call Center para cambiar de especialista.\n\nGracias por utilizar nuestro canal de WhatsApp. ¡Te esperamos pronto!');
    } else {
      return fallBack('Por favor, ingrese una opción válida.');
    }
  })
  .addAction({ capture: true }, async (ctx, { fallBack, flowDynamic }) => {
    // Validar opción de búsqueda
    if (!['1', '2'].includes(ctx.body)) {
      return fallBack('Por favor, seleccione una opción válida: 1️⃣ o 2️⃣.');
    }
  
    if (ctx.body == '2') {
      return flowDynamic('Por favor, ingrese la fecha en el siguiente formato: *Año-Mes-Día* (Ejemplo: 2024-01-15)');
    } else {
      return flowDynamic('Escriba *0* para continuar buscando la fecha más cercana.');
    }
  })
  .addAction({ capture: true }, async (ctx, { fallBack, state }) => {
    let fecha = '';
  
    // Validar fecha o continuar
    if (ctx.body !== '0') {
      if (!validarFecha(ctx.body)) {
        return fallBack('Fecha inválida. Ejemplo correcto: 2024-01-15');
      } else {
        fecha = ctx.body;
      }
    }
  
    await state.update({ fechab: fecha });
  })
  .addAction(async (ctx, { flowDynamic, state, gotoFlow }) => {
    const myState = state.getMyState();
  
    await flowDynamic('⏱️ Estamos buscando disponibilidad, un momento por favor...');
  
    // Datos para la consulta
    const postData = {
      id: cli,
      token: token,
      fecha: myState.fechab,
      codeEsp: myState.esp.CitEspMed,
      codemed: myState.doctor.MMCODM,
    };
  
    // Realizar solicitud de disponibilidad
    const responseData = await getFlujoPost('consultardis', postData);
    const disponibilidad = responseData.data;
  
    if (disponibilidad && disponibilidad.error) {
      await flowDynamic(disponibilidad.error);
      return gotoFlow(flujoUsuariosRegistrados);
    }
  
    if (disponibilidad && disponibilidad.length > 0) {
      // Crear lista de opciones disponibles
      const listaTexto = disponibilidad.map((item, index) => 
        `*${index + 1}.* ${item.nombre_dia} ${item.fecha_cita}, a las ${item.hora_cita} con el profesional ${item.nommed}`
      ).join('\n');
  
      await flowDynamic(`Estas son las opciones disponibles:\n\n${listaTexto}\n\nPor favor, selecciona una de estas opciones.`);
    } else {
      await flowDynamic('No se encontraron citas disponibles. Intente nuevamente más tarde.');
      return gotoFlow(flujoUsuariosRegistrados);
    }
  })
  .addAction({ capture: true }, async (ctx, { fallBack, state, flowDynamic, gotoFlow }) => {
    const myState = state.getMyState();
    const disponibilidad = myState.disponibilidad;
  
    // Validar la opción seleccionada
    const seleccion = parseInt(ctx.body);
    if (!disponibilidad || !Array.isArray(disponibilidad) || disponibilidad.length === 0) {
      return fallBack('No se encontraron resultados de disponibilidad.');
  }
  
  if (isNaN(seleccion) || seleccion < 1 || seleccion > disponibilidad.length) {
      return fallBack('Por favor, selecciona una opción válida.');
  }
  
  
    const citaSeleccionada = disponibilidad[seleccion - 1];
    await state.update({ cita: citaSeleccionada });
  
    await flowDynamic('⏱️ Estamos agendando tu cita, un momento por favor...');
  
    // Datos para agendar la cita
    const postData = {
      id: cli,
      token: token,
      fecha_cita: citaSeleccionada.fecha_cita,
      hora_cita: citaSeleccionada.hora_cita,
      consultorio: citaSeleccionada.consultorio,
      tiempo_cita: citaSeleccionada.tiempo_cita,
      tipoCit: citaSeleccionada.tipoCit,
      MPCedu: myState.documento,
      MPTDoc: myState.tipo,
      MPNOMC: myState.nombre,
      codmed: citaSeleccionada.codmed,
      mecode: citaSeleccionada.mecode,
      nommed: citaSeleccionada.nommed,
      MTCodP: myState.contrato.nivel,
      codCont: myState.contrato.cod_contrato,
      codeCups: myState.cups.cups,
    };
  
    const responseData = await getFlujoPost('crearcita', postData);
    const insertCita = responseData.data;
  
    if (insertCita && insertCita.error) {
      await flowDynamic(insertCita.error);
      return gotoFlow(flujoUsuariosRegistrados);
    }
  
    if (insertCita.validacion === 'true') {
      const mensajeConfirmacion = `🏥 Cita agendada correctamente:\n\n*Número de Cita:* ${insertCita.nro_cita}\n*Fecha:* ${insertCita.fecha}\n*Hora:* ${insertCita.hora}\n*Profesional:* ${insertCita.medico}\n*Cuota:* ${insertCita.cuota_moderadora}`;
      await flowDynamic(mensajeConfirmacion);
      return gotoFlow(flujoUsuariosRegistrados);
    } else {
      await flowDynamic('Error al agendar la cita, por favor intente nuevamente.');
    }
  });
  

//   Flow Pre-Solicitud
const flujoPreSolicitud = addKeyword('#_PRE_REGISTRO#')
.addAnswer('💡 Lo sentimos, no podemos crear tu cita en este momento. Sin embargo, podemos generar una solicitud de cita para que nuestro equipo se comunique contigo y coordine los detalles. ¿Te gustaría continuar?\n\n Por favor, selecciona una opción: \n 1️⃣Sí, deseo continuar \n 2️⃣ No, gracias',
{capture:true},async(ctx, { fallBack,endFlow,gotoFlow,flowDynamic,state }) => { 
        const myState = state.getMyState()
        console.log(myState)
      // resetInactividad(ctx, gotoFlow, timeAct);
      if ( !['1','2'].includes(ctx.body) ) { 
        return fallBack('Por favor escribir una opción valida')
      }
      else if (ctx.body == 2) {
        //stopInactividad(ctx); 
        return endFlow('Gracias por utilizar nuestro canal de WhatsApp. ¡Te esperamos para una próxima!')
      }
    }
)
.addAction( async (ctx, { flowDynamic, state, fallBack,gotoFlow}) => {
    const responseData = await getFlujoGet('getcontratos')
    listaContrato = responseData.data;
    const lista = responseData.data.map(item => ({
      tp_id: item.ct_id,
      tp_name: item.ct_nombre
    }));
  
      const listaTexto = lista.map((objeto, index) =>`*${index+1}.* ${objeto.tp_name}`).join('\n');
      await flowDynamic(`Por favor selecionar su EPS:\n\n${listaTexto} \n \n escribe *volver* para la pregunta anterior \n escribe *Salir* para la pregunta anterior `)
  
})
.addAction({ capture: true }, async (ctx, {state,fallBack,gotoFlow}) => {    
    // resetInactividad(ctx, gotoFlow, timeAct);
    if (ctx.body == '0') {
      return gotoFlow(flujoUsuariosNORegistrados, 6)
    }
      if (ctx.body > 0 && ctx.body <= listaContrato.length) {
        const contratobj = listaContrato[ctx.body-1];
        await state.update({contratonew: contratobj});
          
        } else {
          return fallBack('Por favor escribir una opción valida')
        }
       
  })
  .addAction(async (ctx, { flowDynamic, state, gotoFlow }) => {
    await flowDynamic('⏱️ Consultando las especialidades disponibles...');

    const myState = state.getMyState();
    const postData = { 
        id: cli,
        token: token,
    };

    // Llamada al endpoint
    const response = await getFlujoPost('obtenerespecialidades', postData);
    console.log(response.data)
    const especialidades = response.data.especialidades;

    if (especialidades && especialidades.length > 0) {
        const listaTexto = especialidades.map((esp, index) => 
            `*${index + 1}.* ${esp.nombre}`
        ).join('\n');

        await flowDynamic(`Por favor selecciona una especialidad marcando el número correspondiente:\n\n${listaTexto}`);
    } else {
        await flowDynamic('No se encontraron especialidades disponibles.');
    }
})
.addAction({ capture: true }, async (ctx, { state, flowDynamic }) => {
    const especialidadSeleccionada = state.especialidades[ctx.body - 1];
    await flowDynamic(`Seleccionaste: ${especialidadSeleccionada.nombre}`);
});

//   Flow No registrados
const flujoUsuariosNORegistrados = addKeyword('#_USUARIOS_NO_REGISTRADOS_#')
.addAnswer('📄 Deseas registrarte \n *1.* SI \n *2.* NO',
{capture:true},
    async(ctx, { fallBack,endFlow,gotoFlow }) => {
      // resetInactividad(ctx, gotoFlow, timeAct);
      if ( !['1','2'].includes(ctx.body) ) { 
        return fallBack('Por favor escribir una opción valida')
      }
      else if (ctx.body == 2) {
        //stopInactividad(ctx); 
        return endFlow('Gracias por utilizar nuestro canal de WhatsApp. ¡Te esperamos para una próxima!')
      }
    }
)
.addAnswer('Digite el *PRIMER NOMBRE*', {capture: true}, 
  async (ctx, {state,gotoFlow }) => {await state.update({ nombre: ctx.body })
  // resetInactividad(ctx, gotoFlow, timeAct);
})
.addAnswer('Digite el *PRIMER APELLIDO* \n\nDigita *0* para volver a la pregunta anterior', {capture: true}, 
  async (ctx, {state,gotoFlow}) => {await state.update({ apellido: ctx.body })
  // resetInactividad(ctx, gotoFlow, timeAct);
  if (ctx.body == '0') {
    return gotoFlow(flujoUsuariosNORegistrados, 1)
  }
})
.addAnswer('Seleccionar *Genero*  \n *1.* MASCULINO \n *2.* FEMENINO \n *3.* INDEFINIDO  \n\nDigita *0* para volver a la pregunta anterior',
{capture:true},
    async(ctx, { state,fallBack,gotoFlow }) => {
      // resetInactividad(ctx, gotoFlow, timeAct);
      if ( !['1','2','3'].includes(ctx.body) ) { 
        return fallBack('Por favor escribir una opción valida')
      }
      else if (ctx.body == '0') {
        return gotoFlow(flujoUsuariosNORegistrados, 2)
      }
      let genero ;
        switch (ctx.body) {
          case '1':
            genero = 'M'
          break;
          case '2':
            genero = 'F'
          break;
          case '3':
            genero = 'I'
          break;
        }
      await state.update({ genero: genero })
})
.addAnswer('Por favor digite su número de telefono 📱 celular sin espacios  \n\nDigita *0* para volver a la pregunta anterior',
{capture:true},
    async(ctx, { state,fallBack,gotoFlow }) => {
      // resetInactividad(ctx, gotoFlow, timeAct);
      await state.update({ celular: ctx.body })
      // Expresión regular para verificar si solo contiene números
      var regex = /^[0-9]+$/;

      if (!regex.test(ctx.body)) {
        return fallBack('Por favor escribir una opción valida')
      }
      else if (ctx.body == '0') {
        return gotoFlow(flujoUsuariosNORegistrados, 3)
      }
      
})
.addAnswer('Por favor digite su fecha de nacimiento con el siguiente formato Dia-Mes-Año)   \n\nDigita *0* para volver a la pregunta anterior',
{capture:true},
    async(ctx, { fallBack,gotoFlow,state}) => {
      // resetInactividad(ctx, gotoFlow, timeAct);
      var fecha = ctx.body; // Cambia esto por la fecha que desees validar
        if (!validarFechaNacimiento(fecha)) {
          return fallBack('Por favor escribir una opción valida, te doy un ejemplo : 16-01-1991')
        } 
        else if (ctx.body == '0') {
          return gotoFlow(flujoUsuariosNORegistrados, 4)
        }
        await state.update({ fecha: fecha }) 
      
})
.addAnswer('✉️ Digite su *Correo electronico* \n\nDigita *0* para volver a la pregunta anterior', {capture: true}, 
  async (ctx, {state,gotoFlow,fallBack}) => {
    // resetInactividad(ctx, gotoFlow, timeAct);
    var email = ctx.body; // Cambia esto por la fecha que desees validar
        if (!validarEmail(email)) {
          return fallBack('Por favor escribir una direccion de correo valida')
        } 
        else if (ctx.body == '0') {
          return gotoFlow(flujoUsuariosNORegistrados, 5)
        }
    await state.update({ correo: ctx.body }) 
})
.addAction( async (ctx, { flowDynamic, state, fallBack,gotoFlow}) => {
  const responseData = await getFlujoGet('getcontratos')
  listaContrato = responseData.data;
  const lista = responseData.data.map(item => ({
    tp_id: item.ct_id,
    tp_name: item.ct_nombre
  }));

    const listaTexto = lista.map((objeto, index) =>`*${index+1}.* ${objeto.tp_name}`).join('\n');
    await flowDynamic(`Por favor selecionar su EPS:\n\n${listaTexto} \n \n escribe *volver* para la pregunta anterior \n escribe *Salir* para la pregunta anterior `)

})
.addAction({ capture: true }, async (ctx, {state,fallBack,gotoFlow}) => {    
  // resetInactividad(ctx, gotoFlow, timeAct);
  if (ctx.body == '0') {
    return gotoFlow(flujoUsuariosNORegistrados, 6)
  }
    if (ctx.body > 0 && ctx.body <= listaContrato.length) {
      const contratobj = listaContrato[ctx.body-1];
      await state.update({contratonew: contratobj});
        
      } else {
        return fallBack('Por favor escribir una opción valida')
      }
     
})
.addAnswer('Digite su *Dirección* de vivienda \n\nDigita *0* para volver a la pregunta anterior', {capture: true}, 
  async (ctx, {state,gotoFlow}) => {await state.update({ direccion: ctx.body })
  // resetInactividad(ctx, gotoFlow, timeAct);
  if (ctx.body == '0') {
    return gotoFlow(flujoUsuariosNORegistrados, 7)
  }
})
.addAnswer('Por favor, introduzca hasta tres letras del nombre de su departamento. Por ejemplo, si su departamento se llama *ATLANTICO*, puede ingresar ATL.', {capture: true}, 
  async (ctx, { gotoFlow,flowDynamic,fallBack }) => {
        // resetInactividad(ctx, gotoFlow, timeAct);
        if (ctx.body == '0') {
          return gotoFlow(flujoUsuariosNORegistrados, 8)
        }

        const postData = { 
          depto : ctx.body,
          id : cli,
          token :token
        } 

        const responseData = await getFlujoPost('consultadpto',postData)
        listoDeptos = responseData.data;

        // Validar si el objeto contiene la palabra "error"
        if (listoDeptos && listoDeptos.error) {
          return fallBack(listoDeptos.error)
        } else {
          const listaTexto = responseData.data.map((item, index) => `${index + 1}. ${item.MDNomD}`).join('\n');
          await flowDynamic(`Por favor selecionar su *DEPARTAMENTO*:\n\n${listaTexto} \n \n escribe *0* para la pregunta anterior \n escribe *salir* para terminar el chat`)
        }
  
})
.addAction({ capture: true }, async (ctx, {state,fallBack,gotoFlow}) => {    
  // resetInactividad(ctx, gotoFlow, timeAct);
  if (ctx.body == '0') {
    return gotoFlow(flujoUsuariosNORegistrados, 8)
  }
    if (ctx.body > 0 && ctx.body <= listoDeptos.length) {
      const depto = listoDeptos[ctx.body-1];
      await state.update({depto: depto.MDCodD});
        
      } else {
        return fallBack('Por favor escribir una opción valida')
      }
     
})
.addAnswer('Por favor, introduzca hasta tres letras del nombre de su *Municipio*. Por ejemplo, si su departamento se llama *BARRANQUILLA*, puede ingresar BAR.', {capture: true}, 
  async (ctx, { state,gotoFlow,flowDynamic,fallBack }) => {
    // resetInactividad(ctx, gotoFlow, timeAct);
        if (ctx.body == '0') {
          return gotoFlow(flujoUsuariosNORegistrados, 9)
        }

        const myState = state.getMyState()

        const postData = { 
          depto : myState.depto,
          id : cli,
          token :token,
          mun : ctx.body
        } 

        const responseData = await getFlujoPost('consultamun',postData)
        listoMun = responseData.data;

        // Validar si el objeto contiene la palabra "error"
        if (listoMun && listoMun.error) {
          return fallBack(listoMun.error)
        } else {
          const listaTexto = responseData.data.map((item, index) => `${index + 1}. ${item.MDNomM}`).join('\n');
          await flowDynamic(`Por favor selecionar su *MUNICIPIO*:\n\n${listaTexto} \n \n escribe *0* para la pregunta anterior \n escribe *salir* para terminar el chat`)
        }
  
})
.addAction({ capture: true }, async (ctx, { state, fallBack, gotoFlow, flowDynamic }) => {
    try {
      //  resetInactividad(ctx, gotoFlow, timeAct);
        if (ctx.body == '0') {
            return gotoFlow(flujoUsuariosNORegistrados, 9);
        }

        if (ctx.body > 0 && ctx.body <= listoMun.length) {
            const myState = state.getMyState();
            const municipio = listoMun[ctx.body - 1];

            const postData = {
                id: "2",
                token: token,
                documento: myState.documento,
                tipodoc: myState.tipo,
                apellido: myState.apellido,
                nombre: myState.nombre,
                genero: myState.genero,
                fecha: myState.fecha,
                celular: myState.celular,
                dpto: myState.depto,
                mun: municipio.MDCodM,
                email: myState.correo,
                direccion: myState.direccion,
                contrato: myState.contratonew.ct_codigo,
                tipo_usuario: myState.contratonew.ct_tipo,
                categoria: myState.contratonew.ct_nivel
            };

            const responseData = await getFlujoPost('crearpaciente', postData);

            // Verificación de que responseData y responseData.data existen
            if (responseData && responseData.data) {
                let paciente = responseData.data;

                if (paciente && paciente.error) {
                    await flowDynamic(paciente.error);
                    return gotoFlow(flujoUsuariosNORegistrados);
                } else {
                    let listaTexto = `✅ Usuario registrado exitosamente, ten en cuenta que para poder agendar debes primero comunicarte con el Callcenter`;
                    await flowDynamic(listaTexto);
                    return gotoFlow(flowPrincipal, 1);
                }
            } else {
                console.error('Error en la respuesta de la solicitud:', responseData);
                await flowDynamic('Hubo un error al procesar la solicitud. Por favor, intenta nuevamente.');
                return gotoFlow(flujoUsuariosNORegistrados);
            }
        } else {
            return fallBack('Por favor escribir una opción valida');
        }
    } catch (error) {
        // Manejo de errores de la solicitud HTTP
        console.error('Error al realizar la solicitud:', error.message);
        await flowDynamic('Hubo un error en la conexión. Por favor, intenta nuevamente más tarde.');
        return gotoFlow(flujoUsuariosNORegistrados);
    }
});



// Flow de Cancelación

const flowCancelar = addKeyword('#_CANCELAR_CITA_MEDICA#')
.addAction(async (ctx, { flowDynamic, state, gotoFlow }) => {
  try {
    // Mensaje inicial
    await flowDynamic('⏱️ Vamos a consultar tus citas agendadas.');

    // Obtén el estado actual
    const myState = state.getMyState();
    const postData = { 
      tipodoc: myState.tipo,
      documento: myState.documento,
      id: cli,
      token: token,
    };

    // Consulta las citas del usuario
    const responseData = await getFlujoPost('consultausuario', postData);
    const dataUserCan = responseData.data;

    // Verifica si el usuario tiene citas agendadas
    if (dataUserCan.cita && dataUserCan.cita.length > 0) {
      // Formatea la lista de citas
      const listaTexto = dataUserCan.cita.map((item, index) => 
        `*${index + 1}.* El día ${item.fecha} a las ${item.CitHorI} con el Profesional ${item.medico}, el procedimiento ${item.CitNomPr}.`
      ).join('\n');

      // Muestra la lista al usuario
      await flowDynamic(`Por favor selecciona la *cita* marcando el número indicado:\n\n${listaTexto}`);
      await state.update({ citasDisponibles: dataUserCan.cita }); // Guarda las citas en el estado
    } else {
      // Si no hay citas, informa al usuario
      await flowDynamic(`*${dataUserCan.paciente[0].nombre_paciente}*, no tienes citas para cancelar.`);
      return gotoFlow(flujoUsuariosRegistrados); // Redirige al flujo principal
    }
  } catch (error) {
    console.error('Error al consultar citas:', error);
    await flowDynamic('Hubo un error al consultar tus citas. Por favor, intenta nuevamente más tarde.');
    return gotoFlow(flujoUsuariosRegistrados);
  }
})
.addAction({ capture: true }, async (ctx, { flowDynamic, state, gotoFlow }) => {
  try {
    const citas = state.getMyState().citasDisponibles;
    const seleccion = parseInt(ctx.body, 10) - 1;

    if (!citas || isNaN(seleccion) || seleccion < 0 || seleccion >= citas.length) {
      return await flowDynamic('Por favor selecciona una opción válida.');
    }

    // Actualiza el estado con la cita seleccionada
    const citaSeleccionada = citas[seleccion];
    await state.update({ citacancelar: citaSeleccionada });

    await flowDynamic('¿Nombre de la persona que está cancelando la cita?');
  } catch (error) {
    console.error('Error al seleccionar cita:', error);
    await flowDynamic('Hubo un error al procesar tu selección. Por favor, intenta nuevamente.');
    return gotoFlow(flujoUsuariosRegistrados);
  }
})
.addAction({ capture: true }, async (ctx, { flowDynamic, state }) => {
  // Guarda el nombre de la persona que cancela la cita
  await state.update({ qcancela: ctx.body });
  await flowDynamic('¿Por qué deseas cancelar la cita?');
})
.addAction({ capture: true }, async (ctx, { flowDynamic, state }) => {
  // Guarda la observación/motivo de la cancelación
  await state.update({ observacion: ctx.body });
})
.addAction(null, async (ctx, { flowDynamic, state, gotoFlow }) => {
  try {
    const myState = state.getMyState();
    const postData = {
      id: cli,
      token: token,
      tipodoc: myState.tipo,
      documento: myState.documento,
      citnum: myState.citacancelar.CitNum,
      observacion: myState.observacion,
      qcancela: myState.qcancela,
      parentesco: 'P', // Puedes parametrizar esto si es necesario
      motivoc: 1, // Puedes ajustar el motivo según lo requieras
    };

    console.log('Datos enviados para cancelar la cita:', postData);

    // Llama al servicio de cancelación
    const responseData = await getFlujoPost('cancelacita', postData);
    const cancelar = responseData.data;

    // Verifica la respuesta del servicio
    if (cancelar.validacion === 'true') {
      // Mensaje de confirmación al usuario
      const listaTexto = `✅ Cita cancelada correctamente con el consecutivo: *${cancelar.consecutivo}*.`;
      await flowDynamic(listaTexto);
      return gotoFlow(flujoUsuariosRegistrados); // Redirige al flujo principal
    } else {
      // Mensaje de error si la cancelación no fue exitosa
      const errorMsg = cancelar.error || 'No fue posible cancelar la cita. Por favor, intenta nuevamente.';
      await flowDynamic(`❌ ${errorMsg}`);
      return gotoFlow(flujoUsuariosRegistrados);
    }
  } catch (error) {
    // Manejo de errores inesperados
    console.error('Error al cancelar la cita:', error);
    await flowDynamic('Ocurrió un error al cancelar tu cita. Por favor, intenta nuevamente más tarde.');
    return gotoFlow(flujoUsuariosRegistrados);
  }
});



const flowConsulta = addKeyword('#_CONSULTA_CITA_MEDICA#')
.addAction(async (ctx, { flowDynamic,state,gotoFlow}) => {

  await flowDynamic('⏱️ Vamos a consultar tus citas agendadas ')

  const myState = state.getMyState()
  const postData = { 
    tipodoc : myState.tipo,
    documento : myState.documento,
    id : cli,
    token :token
   } 

  const responseData = await getFlujoPost('consultausuario',postData)
  dataUserCan = responseData.data;
  
  if (dataUserCan.cita.length > 0) {

    const lista = dataUserCan.cita.map(item => ({
      cita: item.CitNum,
      fecha: item.fecha,
      hora: item.CitHorI,
      doctor: item.medico,
      cups: item.CitNomPr,
      consultorio: item.consultorio
    }));
  
    const listaTexto = lista.map((objeto, index) => `*${index+1}.* El dia ${objeto.fecha} a las ${objeto.hora} con el Profesional ${objeto.doctor} el procedimiento ${objeto.cups} `).join('\n');
    await flowDynamic(`${listaTexto}`)
    return  gotoFlow(flujoUsuariosRegistrados)
  } else {
    await flowDynamic(`*${dataUserCan.paciente[0].nombre_paciente}*, No tienes citas agendadas.`)
    return  gotoFlow(flujoUsuariosRegistrados)
  }
})

const flowPreguntas = addKeyword('#_PREGUNTAS_FRECUENTES#')
.addAction(async (ctx, { flowDynamic,state}) => {
  const responseData = await getFlujoGet('getpreguntas')
  listaPreguntas = responseData.data;
  const lista = responseData.data.map(item => ({
    tp_id: item.pre_id,
    tp_name: item.pre_pregunta,
    tp_detail: item.pre_respuesta
  }));

  const listaTexto = lista.map((objeto, index) =>`*${index+1}.* ${objeto.tp_name}`).join('\n');
  await flowDynamic(`Por favor selecciona el numero de la pregunta que deseas aclarar :\n\n${listaTexto} `)
  
})
.addAction({ capture: true }, async (ctx, {flowDynamic,fallBack,gotoFlow}) => {    
  // resetInactividad(ctx, gotoFlow, timeAct);
    if (ctx.body > 0 && ctx.body <= listaPreguntas.length) {
      const resp = listaPreguntas[ctx.body-1];
      await flowDynamic(resp.pre_respuesta+'\n\n Digita *0* para volver a la pregunta anterior o *Menu* para volver ')  
      } else {
        return fallBack('Por favor escribir una opción valida')
      }
     
})
.addAction({ capture: true }, async (ctx, {gotoFlow}) => {    
  // resetInactividad(ctx, gotoFlow, timeAct);
  switch (ctx.body) {
    case '0':
      return gotoFlow(flowPreguntas, 0)
    break;
      default:
        return gotoFlow(flujoUsuariosRegistrados)
      break;

  }
      
})

const flujoFinal = addKeyword(EVENTS.ACTION).addAnswer('Se canceló por inactividad, te esperamos para una proxima')

const flowSalir = addKeyword('salir')
.addAction(null, async (ctx, {endFlow}) => {
     //stopInactividad(ctx); 
      return endFlow('Gracias por utilizar nuestro canal de WhatsApp. ¡Te esperamos para una próxima!')
    }
)

function validarFechaNacimiento(fecha) {
    // Expresión regular para verificar el formato DD-MM-YYYY
    var regex = /^(\d{2})-(\d{2})-(\d{4})$/;
    
    // Verificar si la fecha coincide con el formato esperado
    if (!regex.test(fecha)) {
      return false; // Formato incorrecto
    }
    
    // Obtener los componentes de la fecha
    var partesFecha = fecha.split("-");
    var dia = parseInt(partesFecha[0]);
    var mes = parseInt(partesFecha[1]);
    var anio = parseInt(partesFecha[2]);
    
    // Verificar si es una fecha válida
    var fechaNacimiento = new Date(anio, mes - 1, dia); // Meses en JavaScript son 0-indexados
    if (
      isNaN(fechaNacimiento.getDate()) || // Verificar si el día es válido
      fechaNacimiento.getMonth() + 1 !== mes || // Verificar si el mes es válido
      fechaNacimiento.getFullYear() !== anio // Verificar si el año es válido
    ) {
      return false; // Fecha inválida
    }
    
    // Si la fecha supera la fecha actual, también se considera inválida
    var fechaActual = new Date();
    if (fechaNacimiento > fechaActual) {
      return false; // Fecha futura, inválida
    }
    
    return true; // Fecha válida
  }

function validarFecha(fecha) {
  // Expresión regular para verificar el formato YYYY-MM-DD
  var regex = /^(\d{4})-(\d{2})-(\d{2})$/;
  
  // Verificar si la fecha coincide con el formato esperado
  if (!regex.test(fecha)) {
    return false; // Formato incorrecto
  }
  
  // Obtener los componentes de la fecha
  var partesFecha = fecha.split("-");
  var anio = parseInt(partesFecha[0]);
  var mes = parseInt(partesFecha[1]);
  var dia = parseInt(partesFecha[2]);
  
  // Verificar si es una fecha válida
  var fechaNacimiento = new Date(anio, mes - 1, dia); // Meses en JavaScript son 0-indexados
  if (
    isNaN(fechaNacimiento.getDate()) || // Verificar si el día es válido
    fechaNacimiento.getMonth() + 1 !== mes || // Verificar si el mes es válido
    fechaNacimiento.getFullYear() !== anio // Verificar si el año es válido
  ) {
    return false; // Fecha inválida
  }
  
  return true; // Fecha válida
}

function validarEmail(email) {
  // Expresión regular para validar direcciones de correo electrónico
  var re = /\S+@\S+\.\S+/;
  return re.test(email);
}


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



// Flujo para "Cita de Primera Vez"
const flujoCitaPrimeraVez = addKeyword('#_CITA_PRIMERA_VEZ_#')
  .addAnswer(
    '¡Hola! Activaremos tu trámite de primera cita. ¿Tu EPS está contratada con nosotros? Responde:\n *1.* Sí \n *2.* No',
    { capture: true },
    async (ctx, { fallBack, endFlow, gotoFlow }) => {
      if (!['1', '2'].includes(ctx.body)) {
        return fallBack('Por favor, escribe una opción válida (1 o 2)');
      } else if (ctx.body == '2') {
        return endFlow('Lo sentimos, no podemos continuar con el trámite. Por favor, contacta a tu EPS.');
      }
    }
  )
  .addAnswer(
    'Por favor, proporciona los siguientes datos:\n1. Nombre completo\n2. Número de documento.',
    { capture: true },
    async (ctx, { state, fallBack }) => {
      const datos = ctx.body.split('\n');
      if (datos.length < 2) {
        return fallBack('Por favor, proporciona ambos datos en el formato solicitado.');
      }
      const [nombre, documento] = datos;
      await state.update({ nombre, documento });
    }
  )
  .addAnswer(
    '¿El paciente tiene una patología? Responde:\n *1.* Sí \n *2.* No',
    { capture: true },
    async (ctx, { state, fallBack, gotoFlow }) => {
      if (!['1', '2'].includes(ctx.body)) {
        return fallBack('Por favor, escribe una opción válida (1 o 2)');
      }
      if (ctx.body == '1') {
        await state.update({ tienePatologia: true });
        return gotoFlow(flujoAdjuntarPDF); // Redirige al flujo de adjuntar PDF
      }
      await state.update({ tienePatologia: false });
    }
  )
  .addAnswer(
    '¿Necesitas autorización de servicios con tu EPS? Responde:\n *1.* Sí \n *2.* No',
    { capture: true },
    async (ctx, { state, fallBack, gotoFlow, endFlow }) => {
      if (!['1', '2'].includes(ctx.body)) {
        return fallBack('Por favor, escribe una opción válida (1 o 2)');
      }
      if (ctx.body == '1') {
        return gotoFlow(flujoSeleccionFecha); // Redirige al flujo de selección de fecha
      }
      return endFlow('Gracias por contactarnos. ¿Hay algo más en lo que pueda ayudarte?');
    }
  );

// Flujo para adjuntar PDF
const flujoAdjuntarPDF = addKeyword('#_ADJUNTAR_PDF_#')
  .addAnswer(
    'Por favor, adjunta un archivo en formato PDF con los detalles de la patología.',
    { capture: true },
    async (ctx, { fallBack, state }) => {
      const attachment = ctx.message?.document || ctx.message?.file;
      if (!attachment || attachment.mimetype !== 'application/pdf') {
        return fallBack('Por favor, sube un archivo válido en formato PDF.');
      }
      await state.update({ archivoPatologia: attachment });
    }
  )
  .addAnswer(
    'Archivo recibido correctamente. ¿Necesitas autorización de servicios con tu EPS? Responde:\n *1.* Sí \n *2.* No',
    { capture: true },
    async (ctx, { gotoFlow }) => gotoFlow(flujoSeleccionFecha) // Redirige al flujo de selección de fecha
  );

// Flujo para selección de fecha
const flujoSeleccionFecha = addKeyword('#_SELECCION_FECHA_#')
  .addAnswer(
    'Por favor, selecciona una fecha disponible para tu cita:\n1. Lunes 02/12/2024 - 10:00 AM\n2. Martes 03/12/2024 - 11:00 AM\n3. Miércoles 04/12/2024 - 02:00 PM',
    { capture: true },
    async (ctx, { fallBack, state, endFlow }) => {
      const opciones = ['1', '2', '3'];
      if (!opciones.includes(ctx.body)) {
        return fallBack('Por favor, selecciona una opción válida (1, 2 o 3).');
      }
      const fechas = {
        '1': 'Lunes 02/12/2024 - 10:00 AM',
        '2': 'Martes 03/12/2024 - 11:00 AM',
        '3': 'Miércoles 04/12/2024 - 02:00 PM',
      };
      await state.update({ fechaSeleccionada: fechas[ctx.body] });
      return endFlow(`Tu cita ha sido agendada para: ${fechas[ctx.body]}. ¡Gracias por contactarnos!`);
    }
  );




const main = async () => {
    const adapterFlow = createFlow([flowPrincipal,flujoUsuariosRegistrados,flujoUsuariosNORegistrados,flowAgenda,flowCancelar,flowConsulta,flowSalir,flowPreguntas,flujoFinal,flujoPreSolicitud,registerFlow])
    //const adapterFlow = createFlow([saveFile])
    const adapterProvider = createProvider(Provider)
    const adapterDB = new Database()

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })


    httpServer(+PORT)

     /**
     * Enviar mensaje con metodos propios del provider del bot
     */
 const app = express();
 app.use(bodyParser.json());

 app.post('/send-message-bot', async (req, res) => {

   const objetos = req.body;

   // Bucle for para recorrer cada objeto
 for (let i = 0; i < objetos.length; i++) {
   const nombre = objetos[i].nombre;
   const medico = objetos[i].med;
   const url = objetos[i].url;

 // Enviar mensaje usando los datos del objeto actual
   await adapterProvider.sendText(`${objetos[i].num}@c.us`, `Hola ${nombre}, te recordamos tu cita ${nombre} con el médico ${medico}  por medio de la siguiente URL ${url}`);
 }

 // Enviar la respuesta después de completar el ciclo
 res.send({ data: 'enviado!' });

  // await adapterProvider.sendText(`${numero}@c.us`, `Hola ${nombre}, te recordamos tu cita ${nombre} con el medico ${medico} `)
  // res.send({ data: 'enviado!' })

 })
 const PORT1 = process.env.PORT || 4000;
 app.listen(PORT1, () => console.log(`http://localhost:${PORT1}`))
}

main()

