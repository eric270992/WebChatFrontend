export class Mensaje {
  texto:string = "";
  //Definite Assignment Assertion' to tell typescript that this variable will have a value at runtime as follows
  fecha!:Date;
  //Podriem fer que fós un objecte Usuari i després relacionar els missatges de cada usuari etc..
  username:string = "";
  tipo:string = "";

}
