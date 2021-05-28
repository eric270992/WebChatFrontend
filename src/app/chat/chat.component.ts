import { Component, OnInit } from '@angular/core';
import { Client } from '@stomp/stompjs';
import * as SockJs from 'sockjs-client';
import { Mensaje } from './models/mensaje';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {

  //Declarem el Client de Stomp
  private clientStomp: Client = new Client();
  //Boolea per saber si ja estem conectats o no
  connectat:boolean = false;
  mensaje:Mensaje = new Mensaje();
  mensajes:Mensaje[] = [];

  constructor() { }

  ngOnInit(): void {
    //Inicialitzem el client de stomp
    //this.clientStomp = new Client();
    //Assignem el socket que farà les comunicacions
    this.clientStomp.webSocketFactory = ()=>{
      /*
        Li indiquem el endpoint que ha de ser el mateix que el declarat a Spring WebSocketconfig
        registry.addEndpoint("/chat-websocket")
      */
      return SockJs("http://localhost:8080/chat-websocket");
    }

    //Event per escoltar quant ens conectem o desconectem
    //El creem i assignem al init de l'aplicació
    //L'objecte frame té tota l'informació de la connexió amb el broker
    this.clientStomp.onConnect = (frame)=>{
      console.log("Connectados: "+this.clientStomp.connected+" "+frame);
      //Assignem l'estat de la connexió a true.
      this.connectat = true;
      /*
      Ens subscribim al event del chat, trobem la ruta definida a ChatController @SendTo("ruta") com si fessim peticions a una api @GetMapping etc..
      Cada cop que l'usuari envia un missatge, aquest el rep el broker que després el gestiona i l'enviar
      a tots els clients que estàn subscrits aquest event.
      Recordar que al subsciruren els que fem es escoltar, o mirar si hi ha algun canvi, per poder enviar el missatge tenim el mètode
      enviarMensaje()
      Per tant cada cop que algu publica un missatge, tothom que esitgui aqui subscrit el rebrà, el que fem amb aquest missatge
      és tractar-lo per poder-lo visualitzar.
      */
      this.clientStomp.subscribe('/chat/mensaje', (event)=>{
        //Recuperem el missatge de l'event que bé en format JSON dins el body i fem cast cap a tipus Mensaje
        let missatge:Mensaje = JSON.parse(event.body) as Mensaje;
        //La data ens la hem de converitr a tipus date ja que desde el backend ens arroiba com a LONG
        missatge.fecha = new Date(missatge.fecha);
        this.mensajes.push(missatge);
        console.log(missatge);
      });
    }

    //Event per escoltar quant ens desconectem
    //El creem i assignem al init de l'aplicació
    //L'objecte frame té tota l'informació de la connexió amb el broker
    this.clientStomp.onDisconnect = (frame)=>{
      console.log("Desconnectado: "+!this.clientStomp.connected+" "+frame);
      //Assignem l'estat de la connexió a true.
      this.connectat = false;
    }


  }

  /*Connectarà el chat mitjantçant StompJS al backend */
  connectar(){
    //Activem la connexió i ens connectem
    this.clientStomp.activate();
    //No cal canviar aquí el valor boolea connectat ja que ho farà al disparar-se l'event onConnect
  }

  /*Desconnectarà el chat mitjantçant StompJS al backend */
  desconnectar(){
    //No cal canviar aquí el valor boolea connectat ja que ho farà al disparar-se l'event onDisconnect
    this.clientStomp.deactivate();
  }

  //Enviar un missatge
  enviarMensaje(){
    //Publiquem/enviem un missatge al broker
    //La destinació és el @MessageMapping que trobem al backend de Spring amb el seu prefixe
    //El body serà l'objecte Mensaje que omplim però l'hem de passar amb stringify
    this.clientStomp.publish({destination:'/app/mensaje',body: JSON.stringify(this.mensaje)});
    //Resetejem el text del missatge
    this.mensaje.texto='';
  }

}
