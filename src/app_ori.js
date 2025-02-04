import { join } from 'path'
import { createBot, createProvider, createFlow, addKeyword, utils, EVENTS} from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'


import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
//import { flowInactividad, startInactividad, // resetInactividad, //stopInactividad } from '../lib/idleCasero';
//import { idleFlow, reset, start, stop } from './idle-custom'

import { promises as fs } from 'fs';

import express from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';
import { S3FileUploaderController } from '../services/S3FileUploaderController';

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
        stop(ctx); // Detener la sesión o proceso en curso
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
.addAction(async (ctx, { flowDynamic,state,gotoFlow}) => {
  // resetInactividad(ctx, gotoFlow, timeAct);
  const myState = state.getMyState()
  const postData = { 
    tipodoc : myState.tipo,
    documento : myState.documento,
    id : cli,
    token :token
   } 
   console.log('STP1')
  const responseData = await getFlujoPost('consultausuario',postData)
  contratos = responseData.data.contratos;
  
  const lista = contratos.map(item => ({
    nit: item.nit,
    nombre: item.contrato,
    contrato: item.cod_contrato,
    tipo: item.tipo_usuario,
    nivel: item.nivel
  }));

  const listaTexto = lista.map((objeto, index) => `*${index+1}.* ${objeto.nombre}`).join('\n');
  await flowDynamic(`${mensajes[3].ms_mensaje}: \n\n${listaTexto}`)
})
.addAction({ capture: true }, async (ctx, { flowDynamic,state,fallBack,gotoFlow}) => {
  // resetInactividad(ctx, gotoFlow, timeAct);
  console.log('STP2')
  const myState = state.getMyState()
  const codcontrato = contratos[ctx.body-1]
  await state.update({contrato: codcontrato});

  const postData = { 
    tipodoc : myState.tipo,
    documento : myState.documento,
    id : cli,
    token :token
   } 

  const responseData = await getFlujoPost('consultaresp',postData)
  especialidades = responseData.data;
  
  if (especialidades && especialidades.error) {
      //await flowDynamic(especialidades.error)
      return gotoFlow(flujoPreSolicitud)
  //    return  gotoFlow(flujoUsuariosRegistrados)
  }else{
    const lista = especialidades.map(item => ({
      esp: item.especialidad,
      codesp: item.citespmed
    }));
  
    if (ctx.body > 0 && ctx.body <= contratos.length) {
      const listaTexto = lista.map((objeto, index) => `*${index+1}.* ${objeto.esp}`).join('\n');
      await flowDynamic(`${mensajes[4].ms_mensaje}: \n\n${listaTexto} \n \n Por favor, selecciona una de estas opciones`)
    }else{
      return fallBack('Por favor escribir una opción valida')
    }
  }
  

})
.addAction({ capture: true }, async (ctx, { flowDynamic, state, fallBack, gotoFlow }) => {
    try {
      const codesp = especialidades[ctx.body - 1];
      await state.update({ esp: codesp });
      const myState = state.getMyState();
  
      if (ctx.body > 0 && ctx.body <= especialidades.length) {
        const postData = {
          esp: myState.esp.CitEspMed,
          id: cli,
          token: token
        };
  
        const responseData = await getFlujoPost('consultarcup', postData);
        const cups = responseData.data;
    
        if (Array.isArray(cups)) {
          const lista = cups.map(item => ({
            cups: item.cups,
            cups_det: item.detalle
          }));
  
          if (cups && cups.error) {
            await flowDynamic(cups.error);
            return gotoFlow(flujoUsuariosRegistrados);
          } else {
            const listaTexto = lista.map((objeto, index) => `*${index + 1}.* ${objeto.cups_det}`).join('\n');
            await flowDynamic(`${mensajes[5].ms_mensaje}: \n\n${listaTexto} \n \n Por favor, selecciona una de estas opciones `);
          }
        } else {
          //console.error("La respuesta no es un arreglo:", cups);
          await flowDynamic(cups.error);
          return gotoFlow(flujoUsuariosRegistrados);
        }
      } else {
        return fallBack('Por favor escribe una opción válida');
      }
    } catch (error) {
      console.error('Error en la acción:', error);
      await flowDynamic('Hubo un error, por favor intenta de nuevo.');
    }
  })
.addAction({ capture: true }, async (ctx, { flowDynamic, state ,gotoFlow,fallBack}) => {
  // resetInactividad(ctx, gotoFlow, timeAct);
  const codesp = cups[ctx.body-1]
  await state.update({cups: codesp});
  const myState = state.getMyState()

  if (ctx.body > 0 && ctx.body <= cups.length) {
        const lista = [{
          doctors: myState.esp.CitEspMed,
          doctors_det: myState.esp.medico
        }];

        const listaTexto = lista.map((objeto, index) => `*${index+1}.* ${objeto.doctors_det}`).join('\n');
        await flowDynamic(`${mensajes[6].ms_mensaje} \n ${listaTexto} \n 2. *NO*\n  \n Por favor, selecciona una de estas opciones `);
      
    }else{
      return fallBack('Por favor escribir una opción valida')
    }
  
})
.addAction({ capture: true }, async (ctx, { flowDynamic, state, fallBack,endFlow,gotoFlow}) => {
  const myState = state.getMyState()
  // resetInactividad(ctx, gotoFlow, timeAct);
  if (ctx.body == 1) {
    await state.update({doctor: myState.esp});
    await flowDynamic('Cómo desea buscar disponibilidad para su cita \n\n 1️⃣ Fecha más cercana \n 2️⃣ Fecha específica')
  }else if (ctx.body == 2) {
    //stopInactividad(ctx); 
    return endFlow('Comunicate con el CallCenter para cambiar de especialista, \n\ Gracias por utilizar nuestro canal de WhatsApp. ¡Te esperamos para una próxima!')
  }
  else{
    return fallBack('Por favor escribir una opción valida')
  }

})
.addAction({ capture: true },async(ctx, { fallBack,gotoFlow,flowDynamic}) => {
  // resetInactividad(ctx, gotoFlow, timeAct);
    if ( !['1','2'].includes(ctx.body) ) { 
      return fallBack('Por favor escribir una opción valida')
    }
   
    if (ctx.body == 2) {
       await flowDynamic('Por favor digite la fecha con el siguiente formato Año-Mes-Dia)')
    }else{
      await flowDynamic('Escriba *0* para continuar ')
    }
  
})
.addAction({ capture: true },async(ctx, { fallBack,state,gotoFlow}) => {
  // resetInactividad(ctx, gotoFlow, timeAct);
  var fecha ='';
  if (ctx.body != '0') {
    if (!validarFecha(ctx.body)) {
      return fallBack('Por favor escribir una opción valida, te doy un ejemplo : 1991-01-16')
    }else{
      fecha = ctx.body; 
    }
  }
  
  await state.update({ fechab: fecha }) 

})
.addAction( async (ctx, { flowDynamic, state,gotoFlow}) => {
 
  const myState = state.getMyState()
  await flowDynamic('⏱️ estamos buscando disponibilidad, un momento por favor...')

      const postData = { 
        id : cli,
        token :token,
        fecha : myState.fechab,
        codeEsp : myState.esp.CitEspMed,
        codemed: myState.doctor.MMCODM
      } 
      
      const responseData = await getFlujoPost('consultardis',postData)
      let disponibilidad = responseData.data;
      
      if (disponibilidad && disponibilidad.error) {
          
        await flowDynamic(disponibilidad.error)
        return gotoFlow(flujoUsuariosRegistrados)
        
        }else{
          const lista = disponibilidad.map(item => ({
            dia: item.nombre_dia,
            fecha: item.fecha_cita,
            hora: item.hora_cita,
            doctor: item.nommed,
          }));

          const listaTexto = lista.map((objeto, index) => `*${index+1}.* ${objeto.dia} ${objeto.fecha}, a las ${objeto.hora} con el Profesional ${objeto.doctor}  `).join('\n');
          await flowDynamic(`${mensajes[7].ms_mensaje}: \n\n${listaTexto} \n \n Por favor, selecciona una de estas opciones `)
      
        }

    

})
.addAction({ capture: true }, async (ctx, { flowDynamic, state,gotoFlow,fallBack }) => {
  // resetInactividad(ctx, gotoFlow, timeAct);
  const cita = disponibilidad[ctx.body-1]
  await state.update({cita: cita});
  const myState = state.getMyState()

  if (ctx.body > 0 && ctx.body <= disponibilidad.length) {
    await flowDynamic('⏱️ estamos agendando tu Cita, un momento por favor...')
        const postData = { 
          id : cli,
          token :token,
          fecha_cita:myState.cita.fecha_cita,
          hora_cita: myState.cita.hora_cita,
          consultorio: myState.cita.consultorio,	
          tiempo_cita: myState.cita.tiempo_cita,
          tipoCit : myState.cita.tipoCit,
          MPCedu: myState.documento, 
          MPTDoc: myState.tipo,
          MPNOMC: myState.nombre,
          codmed: myState.cita.codmed,
          mecode: myState.cita.mecode,
          nommed: myState.cita.nommed,
          MTCodP: myState.contrato.nivel,
          codCont: myState.contrato.cod_contrato,
          codeCups:	myState.cups.cups
        } 

        const responseData = await getFlujoPost('crearcita',postData)
        insertCita = responseData.data;

      if (insertCita && insertCita.error) {
        await flowDynamic(insertCita.error)
        return gotoFlow(flujoUsuariosRegistrados)
      } else {
        if (insertCita.validacion == 'true') {
          listaTexto = `🏥 Cita agendada correctamente te confirmo los datos:\n \n*Numero de Cita:* ${insertCita.nro_cita} \n*Fecha:* ${insertCita.fecha} \n*Hora:* ${insertCita.hora} \n*Profesional:* ${insertCita.medico} \n*Cuota:* ${insertCita.cuota_moderadora}`;
          
          await flowDynamic(listaTexto)
          return  gotoFlow(flujoUsuariosRegistrados)
        }else {
            await flowDynamic('Error al agendar la Cita, vuelve a intentarlo')
        }
      }

    }else{
      return fallBack('Por favor escribir una opción valida')
    }
})

//   Flow Pre-Solicitud
const flujoPreSolicitud = addKeyword('#_PRE_REGISTRO#')
.addAnswer('💡 Lo sentimos, no podemos crear tu cita en este momento. Sin embargo, podemos generar una solicitud de cita para que nuestro equipo se comunique contigo y coordine los detalles. ¿Te gustaría continuar?\n\n Por favor, selecciona una opción:\n : \n 1️⃣Sí, deseo continuar \n 2️⃣ No, gracias',
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



// Flow de Cancelacion

const flowCancelar = addKeyword('#_CANCELAR_CITA_MEDICA#')
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
  let dataUserCan = responseData.data;

  if (dataUserCan.cita.length > 0) {

    const lista = dataUserCan.cita.map(item => ({
      cita: item.CitNum,
      fecha: item.fecha,
      hora: item.CitHorI,
      doctor: item.medico,
      cups: item.CitNomPr,
      consultorio:item.consultorio
    }));
  
    const listaTexto = lista.map((objeto, index) => `*${index+1}.* El dia ${objeto.fecha} a las ${objeto.hora} con el Profesional ${objeto.doctor} el procedimiento ${objeto.cups}.`).join('\n');
    await flowDynamic(`Por favor seleccionar la *Cita* marcando el numero indicado :\n  \n ${listaTexto}`)

  } else {
    await flowDynamic(`*${dataUserCan.paciente[0].nombre_paciente}*, No tienes citas para cancelar.`)
    return  gotoFlow(flujoUsuariosRegistrados)
  }
})
.addAction({ capture: true }, async (ctx, { flowDynamic,state,gotoFlow}) => { 
  // resetInactividad(ctx, gotoFlow, timeAct);
  const citcancelar = dataUserCan.cita[ctx.body-1]
  await state.update({citacancelar: citcancelar});
  await flowDynamic(`Nombre de persona que esta cancelando la Cita ?`)
})
.addAction({ capture: true }, async (ctx, { flowDynamic, state,gotoFlow }) => {
  // resetInactividad(ctx, gotoFlow, timeAct);
  await state.update({ qcancela: ctx.body })
  await flowDynamic(`Por que cancela la cita ?`)
})
.addAction({ capture: true }, async (ctx, { gotoFlow, state }) => {
  // resetInactividad(ctx, gotoFlow, timeAct);
  await state.update({ observacion: ctx.body })
})
.addAction(null, async (ctx, { flowDynamic, state, gotoFlow}) => {
  
  const myState = state.getMyState()
  const postData = { 
    id : cli,
    token :token,
    tipodoc: myState.tipo,
    documento: myState.documento,
    citnum: myState.citacancelar.CitNum,
    observacion: myState.observacion,
    qcancela: myState.qcancela,
    parentesco: "P", 
    motivoc: 1
   } 

  const responseData = await getFlujoPost('cancelacita',postData)
  let cancelar = responseData.data;

  if (cancelar.validacion == 'true') {
    let listaTexto = `✅ Cita cancelada correctamente con el consecutivo: *${cancelar.consecutivo}*`;
    await flowDynamic(listaTexto)
    return  gotoFlow(flujoUsuariosRegistrados)
  }else {
      await flowDynamic(cancelar.error)
      return  gotoFlow(flujoUsuariosRegistrados)
  }
  
})

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
          const allowedExtensions = ['jpeg', 'png'];
      
          // Validar tipo de archivo permitido
          if (!allowedExtensions.includes(fileExtension)) {
            throw new Error('El archivo no tiene un formato permitido.');
          }
      
          const fileName = `doc_${doc}.${fileExtension}`;
      
          // Crear un buffer del archivo recibido
          const buffer = await provider.getFileBuffer(ctx);
      
          // Validar tamaño del archivo
          const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
          if (buffer.length > MAX_FILE_SIZE) {
            throw new Error('El archivo supera el tamaño máximo permitido de 5 MB.');
          }
      
          // Subir a S3
          const s3Service = new S3FileUploaderService(); // Instanciar el servicio
          const uploadResult = await s3Service.uploadFileToS3(
            { originalname: fileName, buffer, mimetype: ctx.message.imageMessage.mimetype },
            doc
          );
      
          // Actualizar el estado con la URL del archivo en S3
          await state.update({ filePath: uploadResult.url });
      
          await flowDynamic([
            { body: `¡Archivo recibido y subido exitosamente a S3 como ${fileName}!\nURL: ${uploadResult.url}` },
          ]);
        } catch (error) {
          console.error('Error al procesar el archivo:', error.message);
          await flowDynamic([{ body: 'Hubo un error al procesar el archivo. Por favor, inténtalo de nuevo.' }]);
        }
      })
      
      
    // .addAction(async (ctx, { provider, state, flowDynamic }) => {
    //     try {
    //         if (!ctx.message.imageMessage || !ctx.message.imageMessage.url) {
    //             throw new Error('El archivo enviado no es válido.');
    //         }

    //         const doc = state.get('doc');
    //         const fileExtension = ctx.message.imageMessage.mimetype.split('/')[1];
    //         const directory = `./filesystem/${doc}`;
    //         const fileName = `doc_${doc}.${fileExtension}`;
    //         const fullPath = `${directory}/${fileName}`;

    //         // Verificar si el archivo ya existe
    //         try {
    //             await fs.access(fullPath);  // Verificar si el archivo ya existe
    //             await flowDynamic([{ body: 'Este archivo ya ha sido enviado anteriormente.' }]);
    //             return;  // Detener el proceso si el archivo ya existe
    //         } catch (error) {
    //             // El archivo no existe, continuar con el guardado
    //         }

    //         // Verificar si el directorio existe
    //         try {
    //             await fs.access(directory);
    //         } catch (error) {
    //             // Si no existe, crear el directorio
    //             await fs.mkdir(directory, { recursive: true });
    //         }

    //         // Guardar archivo en un directorio temporal
    //         const tempPath = await provider.saveFile(ctx, { path: directory });

    //         // Renombrar el archivo guardado
    //         await fs.rename(tempPath, fullPath);

    //         // Actualizar el estado con la ruta final
    //         await state.update({ filePath: fullPath });

    //         await flowDynamic([{ body: `¡Archivo recibido y guardado como ${fileName}!` }]);
    //     } catch (error) {
    //         console.error('Error al guardar el archivo:', error);
    //         await flowDynamic([{ body: 'Hubo un error al procesar el archivo. Por favor, inténtalo de nuevo.' }]);
    //     }
    // })
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
}

main()
