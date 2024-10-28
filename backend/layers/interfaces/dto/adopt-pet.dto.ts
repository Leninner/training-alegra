class Adopter {
  constructor(
    public dni: string,
    public name: string,
    public lastName: string,
    public phone: string,
    public email: string,
  ) {}
}

export class AdoptPetDto {
  constructor(
    public petId: string,
    public foundationId: string,
    public adopter: Adopter,
  ) {}
}
