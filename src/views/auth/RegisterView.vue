<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import client from '../../api/client'
  import { useAuthStore } from '../../stores/authStore'
  import { useToast } from 'vue-toastification'
  import { Eye, EyeOff } from 'lucide-vue-next'

  const router = useRouter()
  const toast = useToast()
  const isLoading = ref(false)
  const loadingPlans = ref(true)
  const showPassword = ref(false)

  const fiscalRegimes = [
    { code: '601', label: '601 - General de Ley Personas Morales' },
    { code: '603', label: '603 - Personas Morales con Fines no Lucrativos' },
    { code: '605', label: '605 - Sueldos y Salarios e Ingresos Asimilados' },
    { code: '606', label: '606 - Arrendamiento' },
    { code: '608', label: '608 - Demás ingresos' },
    { code: '612', label: '612 - Personas Físicas con Actividades Empresariales' },
    { code: '616', label: '616 - Sin obligaciones fiscales' },
    { code: '621', label: '621 - Incorporación Fiscal' },
    { code: '622', label: '622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
    { code: '626', label: '626 - Régimen Simplificado de Confianza' },
  ]

  // Catálogo c_UsoCFDI vigente del SAT (CFDI 4.0, 24 claves).
  const cfdiUses = [
    { code: 'G01', label: 'G01 - Adquisición de mercancías' },
    { code: 'G02', label: 'G02 - Devoluciones, descuentos o bonificaciones' },
    { code: 'G03', label: 'G03 - Gastos en general' },
    { code: 'I01', label: 'I01 - Construcciones' },
    { code: 'I02', label: 'I02 - Mobiliario y equipo de oficina por inversiones' },
    { code: 'I03', label: 'I03 - Equipo de transporte' },
    { code: 'I04', label: 'I04 - Equipo de cómputo y accesorios' },
    { code: 'I05', label: 'I05 - Dados, troqueles, moldes, matrices y herramental' },
    { code: 'I06', label: 'I06 - Comunicaciones telefónicas' },
    { code: 'I07', label: 'I07 - Comunicaciones satelitales' },
    { code: 'I08', label: 'I08 - Otra maquinaria y equipo' },
    { code: 'D01', label: 'D01 - Honorarios médicos, dentales y gastos hospitalarios' },
    { code: 'D02', label: 'D02 - Gastos médicos por incapacidad o discapacidad' },
    { code: 'D03', label: 'D03 - Gastos funerales' },
    { code: 'D04', label: 'D04 - Donativos' },
    {
      code: 'D05',
      label: 'D05 - Intereses reales pagados por créditos hipotecarios (casa habitación)',
    },
    { code: 'D06', label: 'D06 - Aportaciones voluntarias al SAR' },
    { code: 'D07', label: 'D07 - Primas por seguros de gastos médicos' },
    { code: 'D08', label: 'D08 - Gastos de transportación escolar obligatoria' },
    {
      code: 'D09',
      label: 'D09 - Depósitos en cuentas para el ahorro, primas de planes de pensiones',
    },
    { code: 'D10', label: 'D10 - Pagos por servicios educativos (colegiaturas)' },
    { code: 'S01', label: 'S01 - Sin efectos fiscales' },
    { code: 'CP01', label: 'CP01 - Pagos' },
    { code: 'CN01', label: 'CN01 - Nómina' },
  ]

  const fallbackLicencias = [
    {
      id: 1,
      nombre: 'Gratis',
      codigo: 'trial',
      tipo: 'trial',
      max_usuarios: 2,
      max_reportes_mensuales: 999999,
      precio: 0,
      precio_anual: null,
      dias_prueba: 0,
      descripcion: 'Plan gratuito para 2 usuarios, sin fecha de expiración',
    },
    {
      id: 2,
      nombre: '5 usuarios - Mensual',
      codigo: 'usuarios_5_mensual',
      tipo: 'mensual',
      max_usuarios: 5,
      max_reportes_mensuales: 999999,
      precio: 399,
      precio_anual: null,
      dias_prueba: 30,
      descripcion: '5 usuarios · $399 MXN al mes · incluye 1 mes gratis',
    },
    {
      id: 3,
      nombre: '5 usuarios - Anual',
      codigo: 'usuarios_5_anual',
      tipo: 'anual',
      max_usuarios: 5,
      max_reportes_mensuales: 999999,
      precio: 399,
      precio_anual: 3990,
      dias_prueba: 30,
      descripcion: '5 usuarios · $3,990 MXN al año · incluye 1 mes gratis',
    },
    {
      id: 4,
      nombre: '10 usuarios - Mensual',
      codigo: 'usuarios_10_mensual',
      tipo: 'mensual',
      max_usuarios: 10,
      max_reportes_mensuales: 999999,
      precio: 699,
      precio_anual: null,
      dias_prueba: 30,
      descripcion: '10 usuarios · $699 MXN al mes · incluye 1 mes gratis',
    },
    {
      id: 5,
      nombre: '10 usuarios - Anual',
      codigo: 'usuarios_10_anual',
      tipo: 'anual',
      max_usuarios: 10,
      max_reportes_mensuales: 999999,
      precio: 699,
      precio_anual: 6990,
      dias_prueba: 30,
      descripcion: '10 usuarios · $6,990 MXN al año · incluye 1 mes gratis',
    },
    {
      id: 6,
      nombre: '30 usuarios - Mensual',
      codigo: 'usuarios_30_mensual',
      tipo: 'mensual',
      max_usuarios: 30,
      max_reportes_mensuales: 999999,
      precio: 1999,
      precio_anual: null,
      dias_prueba: 30,
      descripcion: '30 usuarios · $1,999 MXN al mes · incluye 1 mes gratis',
    },
    {
      id: 7,
      nombre: '30 usuarios - Anual',
      codigo: 'usuarios_30_anual',
      tipo: 'anual',
      max_usuarios: 30,
      max_reportes_mensuales: 999999,
      precio: 1999,
      precio_anual: 19990,
      dias_prueba: 30,
      descripcion: '30 usuarios · $19,990 MXN al año · incluye 1 mes gratis',
    },
  ]

  const formData = reactive({
    companyName: '',
    rfc: '',
    fiscalRegime: '',
    cfdiUse: '',
    username: '',
    firstName: '',
    lastNamePaternal: '',
    lastNameMaternal: '',
    email: '',
    password: '',
    street: '',
    colony: '',
    zipCode: '',
    city: '',
    state: '',
    municipality: '',
    phone: '',
    paymentMethod: '',
    paymentForm: '',
    invoiceRequired: false,
  })

  const licencias = ref<any[]>([])
  const selectedLicencia = ref<string | null>(null)
  const licenciaRegistrada = ref<any | null>(null)
  const showPago = ref(false)

  const selectedPlan = computed(
    () => licencias.value.find(lic => lic.codigo === selectedLicencia.value) || null
  )

  const esPlanGratuito = (lic: any) => lic?.codigo === 'trial' || Number(lic?.precio) === 0

  const formatoMoneda = (valor: number) =>
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(valor)

  const precioPlan = (lic: any) => {
    if (esPlanGratuito(lic)) return 'Gratis'
    const valor = lic.tipo === 'anual' && lic.precio_anual ? lic.precio_anual : lic.precio
    return `${formatoMoneda(Number(valor))} ${lic.tipo === 'anual' ? 'al año' : 'al mes'}`
  }

  const etiquetaPlan = (lic: any) => {
    const condicion = esPlanGratuito(lic) ? 'sin fecha de expiración' : '1 mes gratis'
    return `${lic.nombre} — ${precioPlan(lic)} · ${condicion}`
  }

  const cargarLicencias = async () => {
    loadingPlans.value = true
    try {
      const res = await client.get('/licencias/disponibles')
      const data = res.data.data || res.data
      licencias.value = Array.isArray(data) && data.length > 0 ? data : fallbackLicencias
    } catch {
      licencias.value = fallbackLicencias
    } finally {
      loadingPlans.value = false
      if (!selectedLicencia.value) {
        selectedLicencia.value =
          licencias.value.find(lic => esPlanGratuito(lic))?.codigo ??
          licencias.value[0]?.codigo ??
          null
      }
    }
  }

  const handleRegister = async () => {
    if (!selectedLicencia.value) {
      toast.error('Selecciona un plan para continuar')
      return
    }

    isLoading.value = true
    try {
      const { data } = await client.post('/public/register-compania', {
        companyName: formData.companyName,
        rfc: formData.rfc,
        fiscalRegime: formData.fiscalRegime,
        cfdiUse: formData.cfdiUse,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastNamePaternal: formData.lastNamePaternal,
        lastNameMaternal: formData.lastNameMaternal,
        phone: formData.phone,
        // Token opaco del plan: lo emite el backend y tiene vigencia corta.
        licenciaToken: selectedPlan.value?.token || undefined,
        licenciaId: selectedPlan.value?.id ?? undefined,
      })

      if (data.requiere_verificacion) {
        toast.info('Cuenta creada. Verifica tu correo para activar el acceso.')
        router.push({
          name: 'login',
          query: {
            email: data.user?.email || formData.email,
            verificar: '1',
            enviado: data.correo_enviado === false ? '0' : '1',
          },
        })
        return
      }

      if (data.token && data.user) {
        useAuthStore().applySession(data.user, data.token)
      }

      if (!data.requiere_pago) {
        toast.success('Cuenta creada con el plan Gratis. ¡Bienvenido!')
        router.push({ name: 'dashboard' })
        return
      }

      licenciaRegistrada.value = data.licencia || selectedPlan.value
      showPago.value = true
      toast.success('Cuenta creada con 1 mes gratis del plan que elegiste.')
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ||
          JSON.stringify(e?.response?.data?.errors) ||
          'Error al registrar'
      )
    } finally {
      isLoading.value = false
    }
  }

  const pagarConMercadoPago = async () => {
    const licencia = licenciaRegistrada.value || selectedPlan.value
    if (!licencia?.token && !licencia?.id) {
      toast.error('No se encontró la licencia seleccionada')
      return
    }

    isLoading.value = true
    try {
      const res = licencia.token
        ? await client.post('/licencias/comprar-mercadopago', { licenciaToken: licencia.token })
        : await client.post(`/licencias/${licencia.id}/comprar-mercadopago`)
      const initPoint = res.data.init_point || res.data.initPoint
      if (initPoint) {
        toast.success('Redirigiendo a Mercado Pago...')
        window.location.href = initPoint
      } else {
        toast.success('Licencia activada')
        router.push({ name: 'dashboard' })
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al crear preferencia de pago')
    } finally {
      isLoading.value = false
    }
  }

  onMounted(cargarLicencias)
</script>

<template>
  <div class="split-screen-register">
    <!-- DIVISIÓN PANEL IZQUIERDO-->
    <div class="left-pane">
      <div class="form-container">
        <!-- Datos cabecera (Empresa y demás cosas lol) -->
        <div class="brand">
          <div class="logo-placeholder">coreReports</div>
          <h2>Crear Cuenta</h2>
          <p class="subtitle">Ingrese los datos de su compañia para iniciar.</p>
        </div>

        <form @submit.prevent="handleRegister">
          <!-- SECCIÓN 1 - INFORMACIÓN DE LA COMPAÑÍA-->
          <div class="form-section">
            <h3><span class="step-num">1</span> Información de la compañía</h3>

            <!-- Nombre de la empresa-->
            <div class="form-group">
              <label>Nombre de la Empresa *</label>
              <input
                v-model="formData.companyName"
                type="text"
                required
                placeholder="MATERIALES, TECNOLOGÍA Y AUTOMATIZACIÓN S.A. de C.V."
              />
            </div>

            <!-- 2 input fields in a single row -->
            <div class="row">
              <!-- RFC -->
              <div class="form-group half">
                <label>RFC *</label>
                <input v-model="formData.rfc" type="text" required placeholder="XAXX010101000" />
              </div>

              <!-- CFDI -->
              <div class="form-group half">
                <label>Uso CFDI *</label>
                <select v-model="formData.cfdiUse" required>
                  <option value="" disabled>Seleccione...</option>
                  <option v-for="use in cfdiUses" :key="use.code" :value="use.code">
                    {{ use.label }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Régimen Fiscal -->
            <div class="form-group">
              <label>Régimen Fiscal *</label>
              <select v-model="formData.fiscalRegime" required>
                <option value="" disabled>Seleccione Régimen Fiscal...</option>
                <option v-for="regime in fiscalRegimes" :key="regime.code" :value="regime.code">
                  {{ regime.label }}
                </option>
              </select>
            </div>
          </div>

          <!-- SECCIÓN 2 - INFORMACIÓN DEL ADMINISTRADOR -->
          <div class="form-section">
            <h3><span class="step-num">2</span> Información del administrador</h3>

            <!-- 2 input fields in a single row -->
            <div class="row">
              <!--Nombre de usuario-->
              <div class="form-group half">
                <label>Nombre de Usuario *</label>
                <input v-model="formData.username" type="text" required placeholder="admin_mta" />
              </div>

              <!--Correo electrónico-->
              <div class="form-group half">
                <label>Correo electrónico *</label>
                <input
                  v-model="formData.email"
                  type="email"
                  required
                  placeholder="admin@correo.com"
                />
              </div>
            </div>

            <!-- Contraseña -->
            <div class="form-group">
              <label>Contraseña *</label>
              <div class="password-wrap">
                <input
                  v-model="formData.password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  class="password-toggle"
                  :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" :size="18" />
                  <Eye v-else :size="18" />
                </button>
              </div>
            </div>

            <!--Nombre del administrador-->
            <div class="form-group">
              <label>Nombre(s) *</label>
              <input v-model="formData.firstName" type="text" required />
            </div>

            <!-- 2 input fields in a single row -->
            <div class="row">
              <!--Apellido paterno-->
              <div class="form-group half">
                <label>Apellido Paterno *</label>
                <input v-model="formData.lastNamePaternal" type="text" required />
              </div>

              <!--Apellido Materno-->
              <div class="form-group half">
                <label>Apellido Materno</label>
                <input v-model="formData.lastNameMaternal" type="text" />
              </div>
            </div>
          </div>

          <!-- SECCIÓN 3 - UBICACIÓN Y DATOS DE CONTACTO -->
          <div class="form-section">
            <h3><span class="step-num">3</span> Ubicación y datos de contacto</h3>

            <!--Calle y número-->
            <div class="form-group">
              <label>Calle y Número *</label>
              <input v-model="formData.street" type="text" required placeholder="Av. Reforma 123" />
            </div>

            <!-- 2 input fields in a single row -->
            <div class="row">
              <!--Colonia-->
              <div class="form-group half">
                <label>Colonia *</label>
                <input v-model="formData.colony" type="text" required />
              </div>

              <!--Código postal-->
              <div class="form-group half">
                <label>C.P. *</label>
                <input v-model="formData.zipCode" type="text" required />
              </div>
            </div>

            <!-- 2 input fields in a single row -->
            <div class="row">
              <!--Ciudad-->
              <div class="form-group half">
                <label>Ciudad *</label>
                <input v-model="formData.city" type="text" required />
              </div>

              <!--Estado-->
              <div class="form-group half">
                <label>Estado *</label>
                <input v-model="formData.state" type="text" required />
              </div>
            </div>

            <!-- 2 input fields in a single row -->
            <div class="row">
              <!-- Municipio/Alcaldía-->
              <div class="form-group half">
                <label>Municipio/Alcaldía *</label>
                <input v-model="formData.municipality" type="text" required />
              </div>

              <!-- Teléfono -->
              <div class="form-group half">
                <label>Teléfono *</label>
                <input v-model="formData.phone" type="tel" required />
              </div>
            </div>
          </div>

          <!-- SECCIÓN 4 - DATOS DE PAGO -->
          <div class="form-section">
            <h3><span class="step-num">4</span> Datos de pago</h3>

            <!-- Tipo de licencia (Plan)-->
            <div class="form-group">
              <label>Tipo de Licencia (Plan) *</label>
              <select v-model="selectedLicencia" required :disabled="loadingPlans">
                <option :value="null" disabled>
                  {{ loadingPlans ? 'Cargando planes...' : 'Seleccione un plan...' }}
                </option>
                <option v-for="lic in licencias" :key="lic.codigo" :value="lic.codigo">
                  {{ etiquetaPlan(lic) }}
                </option>
              </select>
              <p class="plan-hint">
                {{
                  selectedPlan
                    ? `${selectedPlan.descripcion} · ${selectedPlan.max_usuarios} usuarios`
                    : 'El plan Gratis no tiene fecha de expiración.'
                }}
              </p>
              <p class="plan-hint">
                El plan Gratis no expira. Todos los planes de pago incluyen 1 mes gratis; si pagas
                ahora, tu periodo de pago comienza al terminar ese mes.
              </p>
            </div>

            <!-- 2 input fields in a single row-->
            <div class="row">
              <!-- Método de pago preferido-->
              <div class="form-group half">
                <label>Método de Pago Preferido *</label>
                <select v-model="formData.paymentMethod" required>
                  <option value="PUE">PUE - Pago en una sola exhibición</option>
                  <option value="PPD">PPD - Pago en parcialidades</option>
                </select>
              </div>

              <!-- Forma de pago-->
              <div class="form-group half">
                <label>Forma de Pago *</label>
                <select v-model="formData.paymentForm" required>
                  <option value="01">01 - Efectivo</option>
                  <option value="03">03 - Transferencia</option>
                  <option value="04">04 - Tarjeta de crédito</option>
                  <option value="99">99 - Por definir</option>
                </select>
              </div>
            </div>

            <!-- Checkbox "Requiero factura"-->
            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.invoiceRequired" />
                <span>Requiero Factura</span>
              </label>
            </div>
          </div>

          <!-- SECCIÓN 5 - MES GRATIS DEL PLAN ELEGIDO -->
          <div
            v-if="showPago && licenciaRegistrada"
            class="form-section"
            style="
              border: 2px solid #3b82f6;
              background: #eff6ff;
              border-radius: 8px;
              padding: 1.5rem;
            "
          >
            <h3>
              <span class="step-num" style="background: #10b981">5</span> Tu mes gratis está activo
            </h3>
            <p class="subtitle" style="margin-bottom: 1rem; color: #475569">
              Tu cuenta ya usa el plan <strong>{{ licenciaRegistrada.nombre }}</strong> durante 1
              mes gratis. Si deseas asegurar la renovación, paga ahora con Mercado Pago: tu periodo
              de pago comenzará al terminar ese mes.
            </p>
            <button
              type="button"
              @click="pagarConMercadoPago"
              :disabled="isLoading"
              class="btn-primary"
              style="background: #009ee3"
            >
              {{ isLoading ? 'Creando preferencia...' : 'Pagar ahora con Mercado Pago' }}
            </button>
            <button
              type="button"
              @click="router.push({ name: 'dashboard' })"
              style="
                width: 100%;
                margin-top: 0.5rem;
                background: transparent;
                border: 1px solid #cbd5e1;
                padding: 0.6rem;
                border-radius: 6px;
                cursor: pointer;
                color: #475569;
              "
            >
              Continuar con mi mes gratis
            </button>
          </div>

          <!-- SECCIÓN 5 - BOTÓN "ENVIAR"-->
          <div v-if="!showPago" class="form-actions">
            <button type="submit" :disabled="isLoading || loadingPlans" class="btn-primary">
              {{ isLoading ? 'Registrando...' : 'Crear cuenta' }}
            </button>
            <p class="login-link">
              ¿Ya tiene una cuenta?
              <router-link :to="{ name: 'login' }">Inicie sesión aquí</router-link>
            </p>
          </div>
        </form>
      </div>
    </div>

    <!-- DIVISIÓN PANEL DERECHO-->
    <div class="right-pane">
      <!-- Imagen fondo panel derecho-->
      <img src="/src/assets/login-image3.png" alt="Industrial Background" class="bg-image" />
      <div class="overlay-content"></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  @use 'sass:color';

  // Color variables
  $dark-blue: #1e3a8a;
  $text-dark: #111827;
  $text-gray: #374151;
  $border-color: #d1d5db;

  // Split screen - Properties
  .split-screen-register {
    display: flex;
    height: 100vh;
    width: 100vw;
    font-family: 'Inter', sans-serif;
    overflow: hidden;
  }

  // Left Pane: Scrolls independently
  .left-pane {
    flex: 1;
    background-color: #ffffff;
    overflow-y: auto; // Enables scrolling for the form
    padding: 2rem;
    display: flex;
    justify-content: center;
  }

  // Form container
  .form-container {
    width: 100%;
    max-width: 500px;
    padding-bottom: 3rem;
  }

  // Brand Header
  .brand {
    margin-bottom: 2rem;
    text-align: center;

    .logo-placeholder {
      font-weight: 900;
      font-size: 1.5rem;
      color: $dark-blue;
      margin-bottom: 0.5rem;
    }

    h2 {
      font-size: 2rem;
      color: $text-dark;
      margin: 0 0 0.5rem 0;
    }

    .subtitle {
      color: #000000;
      font-size: 1rem;
    }
  }

  // Section Styling
  .form-section {
    margin-bottom: 2rem;
    border-bottom: 1px solid #f3f4f6;
    padding-bottom: 1.5rem;

    h3 {
      font-size: 1.1rem;
      color: $dark-blue;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 8px;

      // Número de sección
      .step-num {
        background: $dark-blue;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        font-size: 0.8rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
  }

  // Grid System for Inputs
  .row {
    display: flex;
    gap: 15px;

    .half {
      flex: 1;
    }
  }

  // Form group
  .form-group {
    margin-bottom: 1rem;

    label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: $text-gray;
      margin-bottom: 0.4rem;
    }

    input,
    select {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid $border-color;
      border-radius: 6px;
      font-size: 0.95rem;
      box-sizing: border-box;
      transition: all 0.2s;
      background-color: #fff;

      &:focus {
        border-color: $dark-blue;
        box-shadow: 0 0 0 3px rgba($dark-blue, 0.1);
        outline: none;
      }
    }
  }

  .plan-hint {
    margin: 0.45rem 0 0;
    color: #64748b;
    font-size: 0.78rem;
    line-height: 1.4;
  }

  // Mostrar/ocultar contraseña
  .password-wrap {
    position: relative;
  }

  .password-wrap input {
    width: 100%;
    padding-right: 2.6rem;
  }

  .password-toggle {
    position: absolute;
    right: 0.6rem;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    color: #6b7280;
  }

  .password-toggle:hover {
    color: $dark-blue;
  }

  // Checkbox input
  input[type='checkbox'] {
    width: auto !important;
    margin-right: 10px;
    transform: scale(1.2);
    cursor: pointer;
  }

  //Checkbox group
  .checkbox-group {
    margin-top: 1.5 rem;
    padding: 10px 0;

    // Checkbox label
    .checkbox-label {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 0;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 500;
      color: $text-gray;
    }
  }

  // Actions
  .form-actions {
    margin-top: 2rem;

    // "Create Account" - Properties
    .btn-primary {
      width: 100%;
      padding: 0.9rem;
      background-color: $dark-blue;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: background-color 0.5s;

      // Hover
      &:hover {
        background-color: color.adjust($dark-blue, $lightness: -10%);
      }

      // Disabled
      &:disabled {
        background-color: color.adjust($dark-blue, $lightness: 40%);
        cursor: not-allowed;
      }
    }

    // Login link
    .login-link {
      text-align: center;
      margin-top: 1rem;
      padding-bottom: 3rem;
      font-size: 0.9rem;
      color: #6b7280;

      a {
        color: $dark-blue;
        font-weight: 600;
        text-decoration: none;
      }
    }
  }

  // Right Pane (Fixed)
  .right-pane {
    flex: 1;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0f172a;

    // Image size
    @media (max-width: 900px) {
      display: none;
    }

    //Background image
    .bg-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.7;
    }
  }
</style>
