const fs = require('fs')
const input = require('readline-sync')
const moment = require('moment')

// --------- main classes

class Companies {
  constructor(jsonFilePath) {
      Object.assign(this, JSON.parse(fs.readFileSync(jsonFilePath).toString()));
      this.currentUserIndex
      this.currentCompanyIndex
      this.currentAdminCompanyIndex
      this.currentFilePath = jsonFilePath
  }
  loginEmployee(email, password) {
    this.currentCompanyIndex = this.companies.findIndex(company => {
        this.currentUserIndex = company.employees.findIndex(employee => employee.email === email && employee.password === password)
        return this.currentUserIndex >= 0
    })
    try { return new Employee(this.companies[this.currentCompanyIndex].employees[this.currentUserIndex]) }
    catch { input.question(`\nCredenciais inválidas... `)}
  }
  loginAdminUser(email, password) {
      this.currentAdminCompanyIndex = this.companies.findIndex(company => {
          return company.adminUser.email === email && company.adminUser.password === password
      })
      if (this.currentAdminCompanyIndex >= 0) return new AdminUser(this.companies[this.currentAdminCompanyIndex])
      else input.question(`\nCredenciais inválidas... `)
  }
  updateAttendance(registro){
    if(registro instanceof attendanceInfo){
      this.companies[this.currentCompanyIndex].employees[this.currentUserIndex].attendanceInfo.push(registro)
      this.updateDatabaseFile()
      console.log(`${registro.dict[registro.type]} registrada às ${moment(registro.date).format('HH:mm:ss')}`)
    }
  }
  updateCompanyEmployees(employees){
    this.companies[this.currentAdminCompanyIndex].employees = employees
    this.updateDatabaseFile()
  }
  addNewCompany() {
    console.log('----------------------')
    console.log('Cadastrar nova empresa')
    console.log('----------------------')
    let companyName = input.question('Nome da empresa: ')
    let adminName = input.question('Nome do admin: ')
    let adminEmail = input.question('E-mail do admin: ')
    let adminPassword = input.question('Senha do admin: ')
    let newCompanyObject = {
        name: companyName,
        adminUser: {
            name: adminName,
            email: adminEmail,
            password: adminPassword
        },
        employees: []
    }
    this.companies.push(newCompanyObject)
    this.updateDatabaseFile()
    input.question(`\nEmpresa cadastrada com sucesso! `)
  }
  updateDatabaseFile() {
      fs.writeFileSync(this.currentFilePath, JSON.stringify({ companies: this.companies }))
  }
}

class User {
  constructor(object) {
      Object.assign(this, object)
  }
  getName() { return this.name }
}

class Employee extends User {
    constructor(object) {
        super(object)
        this.horastrabalhadas = {}
        this.diastrabalhados ={}
        this.saldohoras={}
        this.bancoacumulado = 0
    }

    registrarPonto(){
      let data = new Date().toUTCString()
      if(typeof(this.attendanceInfo[this.attendanceInfo.length - 1]) === 'undefined' ){
        let type = 'in'
        return new attendanceInfo(data,type) 
      }
      else{
        let type = this.attendanceInfo[this.attendanceInfo.length - 1].type === 'out' ? 'in' : 'out'
        return new attendanceInfo(data,type) 
      }
    }

    recuperarEspelhoPonto(){ 
      var dict = {"in" : "Entrada", "out":"Saída  "}
      console.log(`
------------------------------------
  Registros de ponto do funcionário:
------------------------------------
  ${this.name}
  ${this.email}
------------------------------------
DATA       |    TIPO   |  HORÁRIO`)
      for (let registro of this.attendanceInfo){
      let data = new Date(Date.parse(registro.date))
      let dia = moment(data).format("DD/MM/YYYY")
      let hora = moment(data).format('HH:mm:ss')
      console.log(`${dia} |   ${dict[registro.type]} |  ${hora}`)
      }
  }

    calcularhorastrabalhadas(){
      const size = this.attendanceInfo.length
      for (let k = 0; k < size-1; k+=2){
      let data_entrada = new Date(Date.parse(this.attendanceInfo[k].date))
      let data_saida = new Date(Date.parse(this.attendanceInfo[k+1].date))
      let mes_corrente = moment(data_entrada).format("MM")
      let diferenca = moment.utc(moment(data_saida).subtract(data_entrada))
      this.horastrabalhadas[mes_corrente] = this.horastrabalhadas[mes_corrente] === undefined ? moment.utc("1970-01-01T00:00:00") : this.horastrabalhadas[mes_corrente]
      let qtd_acumulada = this.horastrabalhadas[mes_corrente] 
      this.horastrabalhadas[mes_corrente] = qtd_acumulada + moment(diferenca) 
      }
  }

    calculardiastrabalhados(){
      const size = this.attendanceInfo.length
      for (let k = 0; k < size-1; k+=2){
      let data_entrada = new Date(Date.parse(this.attendanceInfo[k].date))
      let mes_corrente = moment(data_entrada).format("MM")
      let dia_corrente = moment(data_entrada).format("DD")
      this.diastrabalhados[mes_corrente] = (this.diastrabalhados[mes_corrente] === undefined ? [] : this.diastrabalhados[mes_corrente])
      const tamanho = this.diastrabalhados[mes_corrente].length
      if(!(dia_corrente === this.diastrabalhados[mes_corrente][tamanho-1])){
      this.diastrabalhados[mes_corrente].push(dia_corrente)
      }    
    }
  }

    calcularsaldohoras(){
      for (let k in this.horastrabalhadas){
        this.saldohoras[k] = this.horastrabalhadas[k] 
        for(let j=0; j < this.diastrabalhados[k].length; j++){
        this.saldohoras[k] = this.saldohoras[k] - moment.utc("1970-01-01T08:00:00")
      }
    }
  }

    exibebancohoras(){
      console.log(`
-------------------------------------------------
  Banco de horas do funcionário:
-------------------------------------------------
  ${this.name}
  ${this.email}
  ATENÇÃO: A JORNADA DE TRABALHO EH DE 8 HORAS
-------------------------------------------------
    MES     |  SALDO DE HORAS`)
      
      for (let valor in this.saldohoras){
          console.log(`    ${valor}      | ${this.formatahoras(this.saldohoras[valor])}`)
          this.bancoacumulado += this.saldohoras[valor]
      }
  
      console.log(`-------------------------------------------------
  TOTAL DE HORAS ACUMULADAS:
  ${this.formatahoras(this.bancoacumulado)}`)

  }

  formatahoras(milissegundos){
      let saldo = milissegundos/1000
      let total = Math.abs(saldo)
      let sinal = saldo < 0 ? '-' : ' '
     
      let horas = Math.floor(total/3600)
      let minutos = Math.floor((total%3600)/60)
      let segundos = ((total%3600)%60)

      return(`${sinal}${horas} hora(s) ${minutos} minuto(s) e ${segundos} segundo(s)`)
  }
}

class attendanceInfo {
  constructor(date,type){
    this.dict = {'in' : 'Entrada', 'out' : 'Saída'}
    this.date = date
    this.type = type
  }
}

class AdminUser extends User {
    constructor(object) {
        super(object)
    }
    getAllEmployeesObject() {
        return this.employees
    }
    getAllEmployeesNumberedList() {
      let list = this.getAllEmployeesObject().reduce((acc, employee, index) => `${acc}\n${index + 1}. ${employee.name}`, '')
      return list + `\n\n${this.getAllEmployeesObject().length} profissionais encontrados`
    }
    getSingleEmployeeObject(employeeIndex) {
        return new Employee(this.getAllEmployeesObject()[employeeIndex])
    }
    getSingleEmployeeAttendanceInfo(employeeIndex) {
      if (employeeIndex < this.employees.length) {
        return this.getSingleEmployeeObject(employeeIndex).recuperarEspelhoPonto()
      }
      else { input.question('ID inválido....') }
    }
    getSingleEmployeeBancodehoras(employeeIndex) {
      if (employeeIndex < this.employees.length) {
        let employee = this.getSingleEmployeeObject(employeeIndex)
        employee.calcularhorastrabalhadas()
        employee.calculardiastrabalhados()
        employee.calcularsaldohoras()
        return employee.exibebancohoras()
      }
      else { input.question('ID inválido....') }
  }

  addNewEmployee(){
    console.log('----------------------')
    console.log('Registrar profissional')
    console.log('----------------------')
    let name = input.question('Nome: ')
    let email = input.question('E-mail: ')
    let password = input.question('Senha: ')
    let newEmployeeObject = {
      name: name,
      email: email,
      password: password,
      attendanceInfo: []
    }
    this.employees.push(
      new Employee(newEmployeeObject)
    )
  }
  removeEmployee(id){
    this.employees.splice(id-1,1)
  }
}

// --------- menus

const menuMainOptions = ['Login', 'Login (Admin)', 'Registrar nova empresa']
const menuUserOptions = ['Registrar ponto', 'Espelho de ponto', 'Banco de horas']
const menuAdminOptions = ['Listar profissionais', 'Registrar profissional', 'Remover profissional', 'Verificar espelho ponto', 'Verificar banco de horas']

class Menu {
  constructor(name, options){
    this.name = name
    this.options = options
  }
  getHeader(){ return `\n${("-".repeat(this.name.length))}\n${this.name}\n${("-".repeat(this.name.length))}` }
  getOptions(){ return this.options.reduce((acc, option, index) => `${acc}${index + 1}. ${option}\n`, '\n') + '0. Sair\n'}
  askSomething(){ return input.question('Escolha uma opção: ')}
  printMenu() {
    console.log(this.getHeader())
    console.log(this.getOptions())
    return this.askSomething()
  }
}

// --------- get data from db file

let db = new Companies('db.json')

// --------- menus setup

const menuMain = new Menu('Sistema de ponto', menuMainOptions)

let select
let selectInside

// --------- main

function main() {

  do {

    select = menuMain.printMenu()

    if (select == '1'){
      let email = input.question('\nDigite seu e-mail: ')
      let password = input.question('Digite sua senha: ')
      let user = db.loginEmployee(email, password)
      if (user instanceof Employee) {
        do {
          const menuUser = new Menu(`Olá ${user.getName()}!`, menuUserOptions)
          selectInside = menuUser.printMenu()
          if (selectInside == '1') {
            db.updateAttendance(user.registrarPonto())
          }
          else if (selectInside == '2') {
            user.recuperarEspelhoPonto()
          }
          else if (selectInside == '3') {
            user.calcularhorastrabalhadas()
            user.calculardiastrabalhados()
            user.calcularsaldohoras()
            user.exibebancohoras()
          }
        } while (selectInside != 0)
        input.question(`\nSaindo...`)
      }
    }

    else if (select == '2'){
      let email = input.question('\nDigite seu e-mail: ')
      let password = input.question('Digite sua senha: ')
      let admin = db.loginAdminUser(email, password)
      if (admin instanceof AdminUser) {
        do {
          const menuUser = new Menu(`Olá ${admin.adminUser.name}! (${admin.getName()})`, menuAdminOptions)
          selectInside = menuUser.printMenu()
          if (selectInside == '1') {
            input.question(admin.getAllEmployeesNumberedList())        
          }
          else if (selectInside == '2') {
            admin.addNewEmployee()
            db.updateCompanyEmployees(admin.getAllEmployeesObject())
          }
          else if (selectInside == '3') {
            console.log(admin.getAllEmployeesNumberedList())
            let funcionario = input.question('Digite o ID do funcionário a ser removido: ')
            admin.removeEmployee(funcionario)
            db.updateCompanyEmployees(admin.getAllEmployeesObject())
          }
          else if (selectInside == '4') {
            console.log(admin.getAllEmployeesNumberedList())
            let funcionario = input.question('Digite o ID do funcionário a ser pesquisado: ')
            admin.getSingleEmployeeAttendanceInfo(funcionario-1)
          }
          else if (selectInside == '5') {
            console.log(admin.getAllEmployeesNumberedList())
            let funcionario = input.question('Digite o ID do funcionário a ser pesquisado: ')
            admin.getSingleEmployeeBancodehoras(funcionario-1)
          }
        } while (selectInside != 0)
        input.question(`\nSaindo...`)
      }
    }

    else if (select == '3'){
      db.addNewCompany()
    }

  } while (select != 0)
  console.log(`\nSaindo...`)
}

main()