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
  escribiendoText:string = "";

  //Identificador Unic per els clients
  clientId:String="";

  constructor() {
    //Assignem el clientID la data en milis + un random
    this.clientId = 'id-'+new Date().getUTCMilliseconds()+'-'+Math.random().toString(36).substr(2);
   }

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
        //Primer mirem que sigui del mateix client que acaba de conectar-se, ja que sinó el color l'enviarà a tothom també.
        //Mirem que el missatge que rebem del borker es del tipus nuevo_usuario i que el nom també és el mateix
        if(!this.mensaje.color && missatge.tipo=="NUEVO_USUARIO" && this.mensaje.username == missatge.username){
          this.mensaje.color = missatge.color;
        }
        this.mensajes.push(missatge);
        console.log(missatge);
      });

      //Ens subscirbim als events que rebem del backedn /chat/escribiendo
      this.clientStomp.subscribe('/chat/escribiendo',(event)=>{
        //Assignem el text de que està escribint que rebrem recordem desde el backend ens ho retornà al subsciruren als event
        this.escribiendoText = event.body;
        setTimeout(()=>{
          //PAssats 3s borrem elt ext
          this.escribiendoText="";
        },5000)
      });

      //Dins del onConnect enviem el nom d'usuari el broker
      //Com que el onConnect s'excutarà en el moment que clicquem connectar, i només ho podrem fer si no estem ja conectats i posem
      //username  indiquem que el missatge serà del tipus NUEVO_USUARIO i enviem aquest objecte missatge al broker
      //que el rebrà i també té una validació segons el tipus
      this.mensaje.tipo='NUEVO_USUARIO';
      this.clientStomp.publish({destination:'/app/mensaje',body: JSON.stringify(this.mensaje)});

      //Recuperar historial de mensajes
      //Ens subscirbim al event /chat/historial del broker que ens retornarà un llistat de missatges
      this.clientStomp.subscribe('/chat/historial/'+this.clientId,e=>{
        //Convertim el body que rebem en pla a un array de mensajes
        const historial = JSON.parse(e.body) as Mensaje[];
        //La data que tenim als missatges és en milisegons, per tant indiquem amb .map que per cada missatge faci la conversió de la data
        this.mensajes=historial.map(m => {
          m.fecha = new Date(m.fecha);
          return m;
          //Fem el reverse perquè els ordeni de forma que a dalt hi hagi els antics
        }).reverse();
      });

      //Notifiquem al broker que volem rebre els missatges amb publish que és el endpoint del controler @MessageMapping
      //El body que passem és el paràmetre que rep aquesta funció al backend o em de convertir a JSON per poder enviar
      this.clientStomp.publish({destination:'/app/historial', body: JSON.stringify(this.clientId)});

    }

    //Event per escoltar quant ens desconectem
    //El creem i assignem al init de l'aplicació
    //L'objecte frame té tota l'informació de la connexió amb el broker
    this.clientStomp.onDisconnect = (frame)=>{
      console.log("Desconnectado: "+!this.clientStomp.connected+" "+frame);
      //Assignem l'estat de la connexió a true.
      this.connectat = false;

      //al desconectar fem que reinici els objectes
      this.mensaje = new Mensaje();
      this.mensajes = [];
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
    //Canviem el tipo del missatge a missatge, cosa que afectarà a la vista i també al backend
    this.mensaje.tipo='MENSAJE';
    this.clientStomp.publish({destination:'/app/mensaje',body: JSON.stringify(this.mensaje)});
    //Resetejem el text del missatge, mantenim el username
    this.mensaje.texto='';
  }

  escribiendo(){
    //fa una crida al backend a /app/escribiendo que retornarà el text amb Username esta escribiendo...
    this.clientStomp.publish({destination:'/app/escribiendo',body: JSON.stringify(this.mensaje.username)});
  }

}
