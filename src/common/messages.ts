export interface BASE_MESSAGE {
  type: string
}

//when sending a message
export const IMAGE_PORT = 'IMAGE_PORT'
export const IMAGE_MESSAGE = 'IMAGE_MESSAGE'
export interface SEND_IMAGE extends BASE_MESSAGE {
  image: string
}

export interface RECEIVE_IMAGE extends BASE_MESSAGE {
  content: string
}
