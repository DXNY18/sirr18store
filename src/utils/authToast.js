import Swal from "sweetalert2";

const DARK_THEME = "dark";

function showToast({ icon = "success", title, timer = 1500 }) {
  Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer,
    timerProgressBar: true,
    theme: DARK_THEME,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    }
  }).fire({
    icon,
    title
  });
}

function showModalAlert({
  title,
  text,
  icon,
  confirmButtonColor = "#3085d6",
  draggable = false
}) {
  return Swal.fire({
    title,
    text,
    icon,
    confirmButtonColor,
    draggable,
    theme: DARK_THEME
  });
}

function showConfirmAlert({
  title,
  text,
  confirmButtonText = "Ya",
  cancelButtonColor = "#d33",
  confirmButtonColor = "#3085d6"
}) {
  return Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor,
    cancelButtonColor,
    confirmButtonText,
    theme: DARK_THEME
  });
}

export function showValidationAlert(title, text) {
  showModalAlert({
    title,
    text,
    icon: "warning"
  });
}

export function showErrorAlert(title, text) {
  showModalAlert({
    title,
    text,
    icon: "error",
    confirmButtonColor: "#d33"
  });
}

export function showSuccessAlert(title) {
  showModalAlert({
    title,
    icon: "success",
    draggable: true
  });
}

export function showAlertText(text) {
  showValidationAlert("Perhatian", text);
}

export async function confirmAction(title, text, confirmButtonText = "Ya") {
  const result = await showConfirmAlert({ title, text, confirmButtonText });
  return Boolean(result.isConfirmed);
}

async function showLogoutConfirmation(title, text) {
  const result = await showConfirmAlert({
    title,
    text,
    confirmButtonText: "Ya, logout"
  });

  if (!result.isConfirmed) {
    return false;
  }

  showToast({
    icon: "success",
    title: "Signed out successfully"
  });

  return true;
}

export function showUserLoginSuccessToast() {
  showToast({
    icon: "success",
    title: "User berhasil masuk"
  });
}

export function showAdminLoginSuccessToast() {
  showToast({
    icon: "success",
    title: "Panel Admin aktif"
  });
}

export function showUserLogoutSuccessToast() {
  showToast({
    icon: "success",
    title: "Signed out successfully"
  });
}

export function showUserRegisterSuccessToast() {
  showToast({
    icon: "success",
    title: "Registrasi Berhasil"
  });
}

export function showAdminLogoutSuccessToast() {
  showToast({
    icon: "success",
    title: "Admin berhasil keluar"
  });
}

export function confirmUserLogoutAlert() {
  return showLogoutConfirmation(
    "Are you sure?",
    "Anda akan keluar dari akun user ini."
  );
}

export function confirmAdminLogoutAlert() {
  return showLogoutConfirmation(
    "Are you sure?",
    "Anda akan keluar dari akun admin ini."
  );
}
