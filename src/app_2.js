
import { join } from 'path'
import { createBot, createProvider, createFlow, addKeyword,EVENTS, utils } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'

/*
const { createBot, createProvider, createFlow, addKeyword,EVENTS } = require('@bot-whatsapp/bot')

const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')
const axios = require("axios")
const express = require('express')
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const {flowInactividad, startInactividad, resetInactividad, stopInactividad} = require("./lib/ idleCasero");
*/
dotenv.config();

const ipService = process.env.IP;
const token = process.env.TOKEN;
const cli = process.env.ClI;
const timeAct = process.env.TIME;

const getFlujoGet = async (apiUrl) => {
  try {
    url = ipService+apiUrl
    const response = await axios.get(url);
    return response
  } catch (error) {
    // Manejo de errores
    console.error('Error al realizar la solicitud:', error.message);
  }
};

const getFlujoPost = async (apiUrl,datosPost) => {
  try {
    url = ipService+apiUrl

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
.addAnswer(['Te damos la bienvenida a nuestro canal de WhatsApp, deseas continuar: \n\n *1.* SI \n *2.* NO  '],
 {capture: true},
    async(ctx, { fallBack,endFlow,gotoFlow }) => {

      startInactividad(ctx, gotoFlow, timeAct); // ⬅️⬅️⬅️  INICIAMOS LA CUENTA ATRÁS PARA ESTE USUARIO
      const responseData = await getFlujoGet('getmessage')
      mensajes = responseData.data;

      if ( !['1','2'].includes(ctx.body) ) { 
        return fallBack('Por favor escribir una opción valida')
      }
      if (ctx.body == '2'){ 
        stopInactividad(ctx); 
        return endFlow('Gracias por utilizar nuestro canal de WhatsApp. ¡Te esperamos para una próxima!')

       }

    }
)
.addAction(async (ctx, { flowDynamic,gotoFlow}) => {
  resetInactividad(ctx, gotoFlow, timeAct);
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
  resetInactividad(ctx, gotoFlow, timeAct);
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
    resetInactividad(ctx, gotoFlow, timeAct);
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
  nameUser = responseData.data;

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
  resetInactividad(ctx, gotoFlow, timeAct);
})
.addAction({capture:true},
    async(ctx, {fallBack,endFlow,state,gotoFlow}) => {
      
       if (ctx.body == 'salir') {
        stopInactividad(ctx); 
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
  resetInactividad(ctx, gotoFlow, timeAct);
  const myState = state.getMyState()
  const postData = { 
    tipodoc : myState.tipo,
    documento : myState.documento,
    id : cli,
    token :token
   } 

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
  resetInactividad(ctx, gotoFlow, timeAct);
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
      await flowDynamic(especialidades.error)
      return  gotoFlow(flujoUsuariosRegistrados)
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

.addAction({ capture: true }, async (ctx, { flowDynamic, state, fallBack,gotoFlow }) => {
  resetInactividad(ctx, gotoFlow, timeAct);
  const codesp = especialidades[ctx.body-1]
  await state.update({esp: codesp});
  const myState = state.getMyState()

  if (ctx.body > 0 && ctx.body <= especialidades.length) {

    const postData = { 
      esp : myState.esp.CitEspMed,
      id : cli,
      token :token
     } 
  
    const responseData = await getFlujoPost('consultarcup',postData)
    cups = responseData.data;
    
    const lista = cups.map(item => ({
      cups: item.cups,
      cups_det: item.detalle
    }));

    if (cups && cups.error) {
      await flowDynamic(cups.error)
      return  gotoFlow(flujoUsuariosRegistrados)
    } else {
      const listaTexto = lista.map((objeto, index) => `*${index+1}.* ${objeto.cups_det}`).join('\n');
      await flowDynamic(`${mensajes[5].ms_mensaje}: \n\n${listaTexto} \n \n Por favor, selecciona una de estas opciones `)
    }
  }else{
    return fallBack('Por favor escribir una opción valida')
  }

})
.addAction({ capture: true }, async (ctx, { flowDynamic, state ,gotoFlow,fallBack}) => {
  resetInactividad(ctx, gotoFlow, timeAct);
  const codesp = cups[ctx.body-1]
  await state.update({cups: codesp});
  const myState = state.getMyState()

  if (ctx.body > 0 && ctx.body <= cups.length) {
    /*
    const postData = { 
        codesp : myState.esp.CitEspMed,
        id : cli,
        token :token
      } 

      const responseData = await getFlujoPost('consultarmed',postData)
      doctors = responseData.data;

      if (doctors && doctors.error) {
        await flowDynamic(doctors.error)
        return  gotoFlow(flujoUsuariosRegistrados)
      } else {
        const lista = doctors.map(item => ({
          doctors: item.MMCODM,
          doctors_det: item.nombre
        }));
        const listaTexto = lista.map((objeto, index) => `*${index+1}.* ${objeto.doctors_det}`).join('\n');
        await flowDynamic(`${mensajes[6].ms_mensaje} \n ${listaTexto} \n \n Por favor, selecciona una de estas opciones `)  
      */

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
  resetInactividad(ctx, gotoFlow, timeAct);
  if (ctx.body == 1) {
    await state.update({doctor: myState.esp});
    await flowDynamic('Cómo desea buscar disponibilidad para su cita \n\n 1️⃣ Fecha más cercana \n 2️⃣ Fecha específica')
  }else if (ctx.body == 2) {
    stopInactividad(ctx); 
    return endFlow('Comunicate con el CallCenter para cambiar de especialista, \n\ Gracias por utilizar nuestro canal de WhatsApp. ¡Te esperamos para una próxima!')
  }
  else{
    return fallBack('Por favor escribir una opción valida')
  }

})
.addAction({ capture: true },async(ctx, { fallBack,gotoFlow,flowDynamic}) => {
  resetInactividad(ctx, gotoFlow, timeAct);
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
  resetInactividad(ctx, gotoFlow, timeAct);
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
      disponibilidad = responseData.data;
      
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
  resetInactividad(ctx, gotoFlow, timeAct);
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

//   Flow No registrados
const flujoUsuariosNORegistrados = addKeyword('#_USUARIOS_NO_REGISTRADOS_#')
.addAnswer('📄 Deseas registrarte \n *1.* SI \n *2.* NO',
{capture:true},
    async(ctx, { fallBack,endFlow,gotoFlow }) => {
      resetInactividad(ctx, gotoFlow, timeAct);
      if ( !['1','2'].includes(ctx.body) ) { 
        return fallBack('Por favor escribir una opción valida')
      }
      else if (ctx.body == 2) {
        stopInactividad(ctx); 
        return endFlow('Gracias por utilizar nuestro canal de WhatsApp. ¡Te esperamos para una próxima!')
      }
    }
)
.addAnswer('Digite el *PRIMER NOMBRE*', {capture: true}, 
  async (ctx, {state,gotoFlow }) => {await state.update({ nombre: ctx.body })
  resetInactividad(ctx, gotoFlow, timeAct);
})
.addAnswer('Digite el *PRIMER APELLIDO* \n\nDigita *0* para volver a la pregunta anterior', {capture: true}, 
  async (ctx, {state,gotoFlow}) => {await state.update({ apellido: ctx.body })
  resetInactividad(ctx, gotoFlow, timeAct);
  if (ctx.body == '0') {
    return gotoFlow(flujoUsuariosNORegistrados, 1)
  }
})
.addAnswer('Seleccionar *Genero*  \n *1.* MASCULINO \n *2.* FEMENINO \n *3.* INDEFINIDO  \n\nDigita *0* para volver a la pregunta anterior',
{capture:true},
    async(ctx, { state,fallBack,gotoFlow }) => {
      resetInactividad(ctx, gotoFlow, timeAct);
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
      resetInactividad(ctx, gotoFlow, timeAct);
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
.addAnswer('Por favor digite su fecha de nacimiento con el siguiente formato Año-Mes-Dia)   \n\nDigita *0* para volver a la pregunta anterior',
{capture:true},
    async(ctx, { fallBack,gotoFlow,state}) => {
      resetInactividad(ctx, gotoFlow, timeAct);
      var fecha = ctx.body; // Cambia esto por la fecha que desees validar
        if (!validarFechaNacimiento(fecha)) {
          return fallBack('Por favor escribir una opción valida, te doy un ejemplo : 1991-01-16')
        } 
        else if (ctx.body == '0') {
          return gotoFlow(flujoUsuariosNORegistrados, 4)
        }
        await state.update({ fecha: fecha }) 
      
})
.addAnswer('✉️ Digite su *Correo electronico* \n\nDigita *0* para volver a la pregunta anterior', {capture: true}, 
  async (ctx, {state,gotoFlow,fallBack}) => {
    resetInactividad(ctx, gotoFlow, timeAct);
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
  resetInactividad(ctx, gotoFlow, timeAct);
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
  resetInactividad(ctx, gotoFlow, timeAct);
  if (ctx.body == '0') {
    return gotoFlow(flujoUsuariosNORegistrados, 7)
  }
})
.addAnswer('Por favor, introduzca hasta tres letras del nombre de su departamento. Por ejemplo, si su departamento se llama *ATLANTICO*, puede ingresar ATL.', {capture: true}, 
  async (ctx, { gotoFlow,flowDynamic,fallBack }) => {
        resetInactividad(ctx, gotoFlow, timeAct);
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
  resetInactividad(ctx, gotoFlow, timeAct);
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
    resetInactividad(ctx, gotoFlow, timeAct);
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
.addAction({ capture: true }, async (ctx, {state,fallBack,gotoFlow,flowDynamic}) => {    
  resetInactividad(ctx, gotoFlow, timeAct);
    if (ctx.body == '0') {
      return gotoFlow(flujoUsuariosNORegistrados, 9)
    }
    if (ctx.body > 0 && ctx.body <= listoMun.length) {
        const myState = state.getMyState()
        const municipio = listoMun[ctx.body-1];

          const postData = {
            id:"2",
            token:token,
            documento  : myState.documento,
            tipodoc :  myState.tipo,
            apellido :  myState.apellido,
            nombre  : myState.nombre,
            genero :  myState.genero,
            fecha :  myState.fecha,
            celular  : myState.celular,
            dpto :  myState.depto,
            mun : municipio.MDCodM,
            email : myState.correo,
            direccion : myState.direccion,
            contrato: myState.contratonew.ct_codigo,
            tipo_usuario: myState.contratonew.ct_tipo,
            categoria: myState.contratonew.ct_nivel
        }

          const responseData = await getFlujoPost('crearpaciente',postData)
          paciente = responseData.data;

          if (paciente && paciente.error) {
            await flowDynamic(paciente.error)
            return gotoFlow(flujoUsuariosNORegistrados)
          }else {
              listaTexto = `✅ Usuario registrado exitosamente, ten en cuenta que para poder agendar debes primero comunicarte con el Callcenter`;
              await flowDynamic(listaTexto)
              return  gotoFlow(flowPrincipal,1)
          } 
        
      } else {
        return fallBack('Por favor escribir una opción valida')
      }
     
})


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
  dataUserCan = responseData.data;

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
  resetInactividad(ctx, gotoFlow, timeAct);
  const citcancelar = dataUserCan.cita[ctx.body-1]
  await state.update({citacancelar: citcancelar});
  await flowDynamic(`Nombre de persona que esta cancelando la Cita ?`)
})
.addAction({ capture: true }, async (ctx, { flowDynamic, state,gotoFlow }) => {
  resetInactividad(ctx, gotoFlow, timeAct);
  await state.update({ qcancela: ctx.body })
  await flowDynamic(`Por que cancela la cita ?`)
})
.addAction({ capture: true }, async (ctx, { gotoFlow, state }) => {
  resetInactividad(ctx, gotoFlow, timeAct);
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
  cancelar = responseData.data;

  if (cancelar.validacion == 'true') {
    listaTexto = `✅ Cita cancelada correctamente con el consecutivo: *${cancelar.consecutivo}*`;
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
  resetInactividad(ctx, gotoFlow, timeAct);
    if (ctx.body > 0 && ctx.body <= listaPreguntas.length) {
      const resp = listaPreguntas[ctx.body-1];
      await flowDynamic(resp.pre_respuesta+'\n\n Digita *0* para volver a la pregunta anterior o *Menu* para volver ')  
      } else {
        return fallBack('Por favor escribir una opción valida')
      }
     
})
.addAction({ capture: true }, async (ctx, {gotoFlow}) => {    
  resetInactividad(ctx, gotoFlow, timeAct);
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
     stopInactividad(ctx); 
      return endFlow('Gracias por utilizar nuestro canal de WhatsApp. ¡Te esperamos para una próxima!')
    }
)

function validarFechaNacimiento(fecha) {
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


const app = express()
const main = async () => {
    const adapterDB = new MockAdapter()
    const adapterFlow = createFlow([flowPrincipal,flujoUsuariosRegistrados,flujoUsuariosNORegistrados,flowAgenda,flowCancelar,flowConsulta,flowSalir,flowPreguntas,flujoFinal,flowInactividad, flowPreguntas])
    const adapterProvider = createProvider(BaileysProvider)

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })


    QRPortalWeb()

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
  
      const PORT = process.env.PORT || 4000;
      app.listen(PORT, () => console.log(`http://localhost:${PORT}`))
}

main()
