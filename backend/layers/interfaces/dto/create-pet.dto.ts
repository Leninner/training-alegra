export enum PetType {
  Cat = "cat",
  Dog = "dog",
  Bird = "bird",
}

export enum PetBreed {
  Persian = "persian",
  Siamese = "siamese",
  Poodle = "poodle",
  Bulldog = "bulldog",
  Canary = "canary",
  Parrot = "parrot",
}

export class CreatePetDto {
  constructor(
    public foundationId: string,
    public name: string,
    public type: PetType,
    public breed: PetBreed,
  ) {}
}
