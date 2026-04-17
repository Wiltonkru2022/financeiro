#define MyAppName "FinancePro"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "FinancePro"
#define MyAppExeName "FinancePro.exe"

[Setup]
AppId={{B89F4552-9B28-4A6F-9C8B-F71D65A18E22}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=no
LicenseFile=TERMS.txt
OutputDir=..\release
OutputBaseFilename=FinancePro-Setup-{#MyAppVersion}
SetupIconFile=..\assets\icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
WizardStyle=modern
WizardImageFile=..\assets\installer-sidebar.bmp
WizardSmallImageFile=..\assets\installer-header.bmp
Compression=lzma2/normal
SolidCompression=no
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin
CloseApplications=yes
RestartIfNeededByRun=no
SetupLogging=yes
VersionInfoVersion={#MyAppVersion}
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription=Instalador profissional do FinancePro

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "Criar atalho na area de trabalho"; GroupDescription: "Atalhos:"; Flags: unchecked

[Files]
Source: "..\release\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Desinstalar {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Abrir {#MyAppName}"; Flags: nowait postinstall skipifsilent

[Code]
procedure InitializeWizard();
begin
  WizardForm.WelcomeLabel1.Caption := 'Bem-vindo ao FinancePro';
  WizardForm.WelcomeLabel2.Caption := 'Este assistente vai instalar o sistema financeiro no seu computador.';
  WizardForm.FinishedLabel.Caption := 'Instalacao concluida com sucesso. Voce ja pode abrir o FinancePro e ativar sua licenca.';
end;
