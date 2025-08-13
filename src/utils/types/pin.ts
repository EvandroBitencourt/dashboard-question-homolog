export interface PinProps {
    id?: number;

    // dados principais
    name: string;
    pin_code?: string;           // opcional no create (o backend gera)

    // status de vínculo
    assigned?: boolean | 0 | 1;  // backend pode devolver 0/1; no app use boolean

    // dados do aparelho (preenchidos depois, no app)
    uuid?: string | null;
    device_model?: string | null;
    app_version?: string | null;
    android_version?: string | null;

}
